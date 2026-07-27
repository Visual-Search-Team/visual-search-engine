package com.imagesearch.backend_java.auth.service;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.dto.request.LoginRequest;
import com.imagesearch.backend_java.auth.dto.response.LoginUserResponse;
import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.exception.AuthException;
import com.imagesearch.backend_java.auth.mapper.UserMapper;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    private static final long REFRESH_TOKEN_EXPIRATION_SECONDS = 604_800L;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserMapper userMapper;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private Authentication authentication;

    @Mock
    private Claims claims;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtService,
                userMapper,
                redisTemplate
        );
    }

    @Test
    void loginStoresRefreshTokenJtiInRedis() {
        User user = activeUser();
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername("john")
                .password("hash")
                .roles("USER")
                .build();
        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("john");
        request.setPassword("Password123");

        when(authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken("john", "Password123")
        )).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user)).thenReturn("refresh-token");
        when(jwtService.extractRefreshTokenClaims("refresh-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("refresh-jti");
        when(jwtService.getRefreshTokenExpirationSeconds()).thenReturn(REFRESH_TOKEN_EXPIRATION_SECONDS);
        when(jwtService.getAccessTokenExpirationSeconds()).thenReturn(86_400L);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(userMapper.toLoginUserResponse(user)).thenReturn(LoginUserResponse.builder()
                .id(1L)
                .username("john")
                .email("john@example.com")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build());

        AuthService.LoginResult result = authService.login(request);

        assertThat(result.response().getAccessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        verify(valueOperations).set(
                "auth:refresh:refresh-jti",
                "1",
                Duration.ofSeconds(REFRESH_TOKEN_EXPIRATION_SECONDS)
        );
    }

    @Test
    void loginReturnsAccessTokenWhenRedisCannotStoreRefreshToken() {
        User user = activeUser();
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername("john")
                .password("hash")
                .roles("USER")
                .build();
        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("john");
        request.setPassword("Password123");

        when(authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken("john", "Password123")
        )).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user)).thenReturn("refresh-token");
        when(jwtService.extractRefreshTokenClaims("refresh-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("refresh-jti");
        when(jwtService.getRefreshTokenExpirationSeconds()).thenReturn(REFRESH_TOKEN_EXPIRATION_SECONDS);
        when(jwtService.getAccessTokenExpirationSeconds()).thenReturn(86_400L);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RedisConnectionFailureException("Unable to connect to Redis"))
                .when(valueOperations)
                .set(
                        "auth:refresh:refresh-jti",
                        "1",
                        Duration.ofSeconds(REFRESH_TOKEN_EXPIRATION_SECONDS)
                );
        when(userMapper.toLoginUserResponse(user)).thenReturn(LoginUserResponse.builder()
                .id(1L)
                .username("john")
                .email("john@example.com")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build());

        AuthService.LoginResult result = authService.login(request);

        assertThat(result.response().getAccessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void refreshTokenRejectsTokenWhenRedisSessionDoesNotExist() {
        when(jwtService.extractRefreshTokenClaims("refresh-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("refresh-jti");
        when(claims.getSubject()).thenReturn("john");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("auth:refresh:refresh-jti")).thenReturn(null);

        assertThatThrownBy(() -> authService.refreshToken("refresh-token"))
                .isInstanceOf(AuthException.class)
                .satisfies(exception -> {
                    AuthException authException = (AuthException) exception;
                    assertThat(authException.getHttpStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(authException.getCode()).isEqualTo("AUTH_REFRESH_TOKEN_INVALID");
                });
    }

    @Test
    void refreshTokenRotatesRedisSession() {
        User user = activeUser();
        Claims rotatedClaims = org.mockito.Mockito.mock(Claims.class);

        when(jwtService.extractRefreshTokenClaims("old-refresh-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("old-jti");
        when(claims.getSubject()).thenReturn("john");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("auth:refresh:old-jti")).thenReturn("1");
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user)).thenReturn("new-access-token");
        when(jwtService.generateRefreshToken(user)).thenReturn("new-refresh-token");
        when(jwtService.extractRefreshTokenClaims("new-refresh-token")).thenReturn(rotatedClaims);
        when(rotatedClaims.getId()).thenReturn("new-jti");
        when(jwtService.getRefreshTokenExpirationSeconds()).thenReturn(REFRESH_TOKEN_EXPIRATION_SECONDS);
        when(jwtService.getAccessTokenExpirationSeconds()).thenReturn(86_400L);

        AuthService.RefreshTokenResult result = authService.refreshToken("old-refresh-token");

        assertThat(result.response().getAccessToken()).isEqualTo("new-access-token");
        assertThat(result.refreshToken()).isEqualTo("new-refresh-token");
        verify(redisTemplate).delete("auth:refresh:old-jti");
        verify(valueOperations).set(
                "auth:refresh:new-jti",
                "1",
                Duration.ofSeconds(REFRESH_TOKEN_EXPIRATION_SECONDS)
        );
    }

    private User activeUser() {
        return User.builder()
                .id(1L)
                .username("john")
                .email("john@example.com")
                .passwordHash("hash")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
