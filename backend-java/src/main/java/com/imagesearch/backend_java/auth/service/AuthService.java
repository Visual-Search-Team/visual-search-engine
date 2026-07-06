package com.imagesearch.backend_java.auth.service;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.dto.request.ChangePasswordRequest;
import com.imagesearch.backend_java.auth.dto.request.LoginRequest;
import com.imagesearch.backend_java.auth.dto.request.RegisterRequest;
import com.imagesearch.backend_java.auth.dto.response.ChangePasswordResponse;
import com.imagesearch.backend_java.auth.dto.response.LoginResponse;
import com.imagesearch.backend_java.auth.dto.response.LogoutResponse;
import com.imagesearch.backend_java.auth.dto.response.MeResponse;
import com.imagesearch.backend_java.auth.dto.response.RefreshTokenResponse;
import com.imagesearch.backend_java.auth.dto.response.RegisterResponse;
import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.exception.AuthException;
import com.imagesearch.backend_java.auth.mapper.UserMapper;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final String REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AuthException(HttpStatus.CONFLICT, "USERNAME_ALREADY_EXISTS", "Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

        return userMapper.toRegisterResponse(userRepository.save(user));
    }

    public LoginResult login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        UserDetails principal = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        validateActiveUser(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        storeRefreshToken(refreshToken, user);
        LoginResponse response = LoginResponse.builder()
                .accessToken(accessToken)
                .expiresIn(jwtService.getAccessTokenExpirationSeconds())
                .user(userMapper.toLoginUserResponse(user))
                .build();

        return new LoginResult(response, refreshToken);
    }

    public RefreshTokenResult refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthException(
                    HttpStatus.UNAUTHORIZED,
                    "AUTH_REFRESH_TOKEN_INVALID",
                    "Refresh token is invalid"
            );
        }

        try {
            Claims claims = jwtService.extractRefreshTokenClaims(refreshToken);
            String tokenId = claims.getId();
            String username = claims.getSubject();

            if (tokenId == null || tokenId.isBlank() || username == null || username.isBlank()) {
                throw invalidRefreshTokenException();
            }

            String storedUserId = redisTemplate.opsForValue().get(refreshTokenKey(tokenId));
            if (storedUserId == null) {
                throw invalidRefreshTokenException();
            }

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

            validateActiveUser(user);
            if (!storedUserId.equals(String.valueOf(user.getId()))) {
                throw invalidRefreshTokenException();
            }

            String accessToken = jwtService.generateAccessToken(user);
            String rotatedRefreshToken = jwtService.generateRefreshToken(user);
            redisTemplate.delete(refreshTokenKey(tokenId));
            storeRefreshToken(rotatedRefreshToken, user);
            RefreshTokenResponse response = RefreshTokenResponse.builder()
                    .accessToken(accessToken)
                    .expiresIn(jwtService.getAccessTokenExpirationSeconds())
                    .build();

            return new RefreshTokenResult(response, rotatedRefreshToken);
        } catch (JwtException | IllegalArgumentException exception) {
            throw new AuthException(
                    HttpStatus.UNAUTHORIZED,
                    "AUTH_REFRESH_TOKEN_INVALID",
                    "Refresh token is invalid"
            );
        }
    }

    public MeResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        return userMapper.toMeResponse(user);
    }

    @Transactional
    public ChangePasswordResponse changePassword(String username, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new AuthException(
                    HttpStatus.BAD_REQUEST,
                    "PASSWORD_CONFIRMATION_MISMATCH",
                    "Password confirmation does not match"
            );
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AuthException(
                    HttpStatus.UNAUTHORIZED,
                    "CURRENT_PASSWORD_INCORRECT",
                    "Current password is incorrect"
            );
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return new ChangePasswordResponse("Password changed successfully");
    }

    public LogoutResponse logout(String refreshToken) {
        deleteRefreshToken(refreshToken);
        return new LogoutResponse("Logout successfully");
    }

    private void validateActiveUser(User user) {
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new AuthException(HttpStatus.FORBIDDEN, "AUTH_ACCOUNT_INACTIVE", "Account is inactive");
        }
        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new AuthException(HttpStatus.FORBIDDEN, "AUTH_ACCOUNT_BLOCKED", "Account is blocked");
        }
    }

    public long getRefreshTokenExpirationSeconds() {
        return jwtService.getRefreshTokenExpirationSeconds();
    }

    private void storeRefreshToken(String refreshToken, User user) {
        Claims claims = jwtService.extractRefreshTokenClaims(refreshToken);
        String tokenId = claims.getId();
        if (tokenId == null || tokenId.isBlank()) {
            throw invalidRefreshTokenException();
        }

        redisTemplate.opsForValue().set(
                refreshTokenKey(tokenId),
                String.valueOf(user.getId()),
                Duration.ofSeconds(jwtService.getRefreshTokenExpirationSeconds())
        );
    }

    private void deleteRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        try {
            Claims claims = jwtService.extractRefreshTokenClaims(refreshToken);
            String tokenId = claims.getId();
            if (tokenId != null && !tokenId.isBlank()) {
                redisTemplate.delete(refreshTokenKey(tokenId));
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            // Logout should still clear the browser cookie even when the refresh token is already invalid.
        }
    }

    private String refreshTokenKey(String tokenId) {
        return REFRESH_TOKEN_KEY_PREFIX + tokenId;
    }

    private AuthException invalidRefreshTokenException() {
        return new AuthException(
                HttpStatus.UNAUTHORIZED,
                "AUTH_REFRESH_TOKEN_INVALID",
                "Refresh token is invalid"
        );
    }

    public record LoginResult(LoginResponse response, String refreshToken) {
    }

    public record RefreshTokenResult(RefreshTokenResponse response, String refreshToken) {
    }
}
