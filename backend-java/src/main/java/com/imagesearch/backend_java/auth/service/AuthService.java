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
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
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
@Slf4j(topic = "AUTH-SERVICE")
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
        log.info("Entered register service, username={}, email={}", request.getUsername(), request.getEmail());
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Register service rejected, username already exists: {}", request.getUsername());
            throw new AuthException(HttpStatus.CONFLICT, "USERNAME_ALREADY_EXISTS", "Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Register service rejected, email already exists: {}", request.getEmail());
            throw new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Completed register service, userId={}, username={}", savedUser.getId(), savedUser.getUsername());
        return userMapper.toRegisterResponse(savedUser);
    }

    public LoginResult login(LoginRequest request) {
        log.info("Entered login service, usernameOrEmail={}", request.getUsernameOrEmail());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        UserDetails principal = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        log.info("Login service authenticated principal, username={}", user.getUsername());
        validateActiveUser(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        storeRefreshTokenBestEffort(refreshToken, user);
        LoginResponse response = LoginResponse.builder()
                .accessToken(accessToken)
                .expiresIn(jwtService.getAccessTokenExpirationSeconds())
                .user(userMapper.toLoginUserResponse(user))
                .build();

        log.info("Completed login service, userId={}, username={}", user.getId(), user.getUsername());
        return new LoginResult(response, refreshToken);
    }

    public RefreshTokenResult refreshToken(String refreshToken) {
        log.info("Entered refreshToken service, hasRefreshToken={}", hasText(refreshToken));
        if (refreshToken == null || refreshToken.isBlank()) {
            log.warn("RefreshToken service rejected, refresh token is missing");
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
            log.info("RefreshToken service extracted claims, tokenId={}, username={}", tokenId, username);

            if (tokenId == null || tokenId.isBlank() || username == null || username.isBlank()) {
                log.warn("RefreshToken service rejected, missing tokenId or username claim");
                throw invalidRefreshTokenException();
            }

            String storedUserId = redisTemplate.opsForValue().get(refreshTokenKey(tokenId));
            if (storedUserId == null) {
                log.warn("RefreshToken service rejected, tokenId not found in Redis: {}", tokenId);
                throw invalidRefreshTokenException();
            }

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

            validateActiveUser(user);
            if (!storedUserId.equals(String.valueOf(user.getId()))) {
                log.warn(
                        "RefreshToken service rejected, storedUserId={} does not match userId={}",
                        storedUserId,
                        user.getId()
                );
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

            log.info("Completed refreshToken service, userId={}, username={}", user.getId(), user.getUsername());
            return new RefreshTokenResult(response, rotatedRefreshToken);
        } catch (JwtException | IllegalArgumentException exception) {
            log.warn("RefreshToken service rejected, token parsing failed: {}", exception.getClass().getSimpleName());
            throw new AuthException(
                    HttpStatus.UNAUTHORIZED,
                    "AUTH_REFRESH_TOKEN_INVALID",
                    "Refresh token is invalid"
            );
        }
    }

    public MeResponse getCurrentUser(String username) {
        log.info("Entered getCurrentUser service, username={}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        log.info("Completed getCurrentUser service, userId={}, username={}", user.getId(), user.getUsername());
        return userMapper.toMeResponse(user);
    }

    @Transactional
    public ChangePasswordResponse changePassword(String username, ChangePasswordRequest request) {
        log.info("Entered changePassword service, username={}", username);
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            log.warn("ChangePassword service rejected, password confirmation mismatch for username={}", username);
            throw new AuthException(
                    HttpStatus.BAD_REQUEST,
                    "PASSWORD_CONFIRMATION_MISMATCH",
                    "Password confirmation does not match"
            );
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            log.warn("ChangePassword service rejected, current password incorrect for username={}", username);
            throw new AuthException(
                    HttpStatus.UNAUTHORIZED,
                    "CURRENT_PASSWORD_INCORRECT",
                    "Current password is incorrect"
            );
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Completed changePassword service, userId={}, username={}", user.getId(), user.getUsername());
        return new ChangePasswordResponse("Password changed successfully");
    }

    public LogoutResponse logout(String refreshToken) {
        log.info("Entered logout service, hasRefreshToken={}", hasText(refreshToken));
        deleteRefreshToken(refreshToken);
        log.info("Completed logout service");
        return new LogoutResponse("Logout successfully");
    }

    private void validateActiveUser(User user) {
        log.info("Validating active user, userId={}, username={}, status={}", user.getId(), user.getUsername(), user.getStatus());
        if (user.getStatus() == UserStatus.INACTIVE) {
            log.warn("User validation rejected, account inactive: userId={}", user.getId());
            throw new AuthException(HttpStatus.FORBIDDEN, "AUTH_ACCOUNT_INACTIVE", "Account is inactive");
        }
        if (user.getStatus() == UserStatus.BLOCKED) {
            log.warn("User validation rejected, account blocked: userId={}", user.getId());
            throw new AuthException(HttpStatus.FORBIDDEN, "AUTH_ACCOUNT_BLOCKED", "Account is blocked");
        }
        log.info("User validation passed, userId={}", user.getId());
    }

    public long getRefreshTokenExpirationSeconds() {
        log.info("Entered getRefreshTokenExpirationSeconds service");
        return jwtService.getRefreshTokenExpirationSeconds();
    }

    private void storeRefreshTokenBestEffort(String refreshToken, User user) {
        try {
            storeRefreshToken(refreshToken, user);
        } catch (RedisConnectionFailureException exception) {
            log.error(
                    "Login continues without storing refresh token because Redis is unavailable, userId={}",
                    user.getId(),
                    exception
            );
        }
    }

    private void storeRefreshToken(String refreshToken, User user) {
        log.info("Entered storeRefreshToken service, userId={}", user.getId());
        Claims claims = jwtService.extractRefreshTokenClaims(refreshToken);
        String tokenId = claims.getId();
        if (tokenId == null || tokenId.isBlank()) {
            log.warn("StoreRefreshToken service rejected, tokenId is missing");
            throw invalidRefreshTokenException();
        }

        redisTemplate.opsForValue().set(
                refreshTokenKey(tokenId),
                String.valueOf(user.getId()),
                Duration.ofSeconds(jwtService.getRefreshTokenExpirationSeconds())
        );
        log.info("Completed storeRefreshToken service, userId={}, tokenId={}", user.getId(), tokenId);
    }

    private void deleteRefreshToken(String refreshToken) {
        log.info("Entered deleteRefreshToken service, hasRefreshToken={}", hasText(refreshToken));
        if (refreshToken == null || refreshToken.isBlank()) {
            log.info("Skipped deleteRefreshToken service, refresh token is missing");
            return;
        }

        try {
            Claims claims = jwtService.extractRefreshTokenClaims(refreshToken);
            String tokenId = claims.getId();
            if (tokenId != null && !tokenId.isBlank()) {
                redisTemplate.delete(refreshTokenKey(tokenId));
                log.info("Deleted refresh token from Redis, tokenId={}", tokenId);
            } else {
                log.warn("Skipped Redis delete, tokenId is missing");
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            log.warn("Skipped Redis delete, refresh token parsing failed: {}", ignored.getClass().getSimpleName());
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

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record LoginResult(LoginResponse response, String refreshToken) {
    }

    public record RefreshTokenResult(RefreshTokenResponse response, String refreshToken) {
    }
}
