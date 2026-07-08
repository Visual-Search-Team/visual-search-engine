package com.imagesearch.backend_java.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.dto.request.LoginRequest;
import com.imagesearch.backend_java.auth.dto.request.RegisterRequest;
import com.imagesearch.backend_java.auth.dto.response.ChangePasswordResponse;
import com.imagesearch.backend_java.auth.dto.response.LoginResponse;
import com.imagesearch.backend_java.auth.dto.response.LoginUserResponse;
import com.imagesearch.backend_java.auth.dto.response.LogoutResponse;
import com.imagesearch.backend_java.auth.dto.response.MeResponse;
import com.imagesearch.backend_java.auth.dto.response.RefreshTokenResponse;
import com.imagesearch.backend_java.auth.dto.response.RegisterResponse;
import com.imagesearch.backend_java.auth.exception.AuthException;
import com.imagesearch.backend_java.auth.exception.GlobalExceptionHandler;
import com.imagesearch.backend_java.auth.service.AuthService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {
    private static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    private static final String REFRESH_TOKEN_COOKIE_PATH = "/visual-search/v1/auth";
    private static final long REFRESH_TOKEN_MAX_AGE_SECONDS = 604_800L;

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(new AuthController(authService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void registerReturnsCreatedResponse() throws Exception {
        RegisterResponse registerResponse = RegisterResponse.builder()
                .id(1L)
                .username("john")
                .email("john@example.com")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.of(2026, 7, 3, 10, 0))
                .build();
        when(authService.register(any(RegisterRequest.class))).thenReturn(registerResponse);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(asJson(Map.of(
                                "username", "john",
                                "email", "john@example.com",
                                "password", "Password123!"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("john"))
                .andExpect(jsonPath("$.data.email").value("john@example.com"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.error").doesNotExist());

        ArgumentCaptor<RegisterRequest> requestCaptor = ArgumentCaptor.forClass(RegisterRequest.class);
        verify(authService).register(requestCaptor.capture());
        RegisterRequest capturedRequest = requestCaptor.getValue();
        assertThat(capturedRequest.getUsername()).isEqualTo("john");
        assertThat(capturedRequest.getEmail()).isEqualTo("john@example.com");
        assertThat(capturedRequest.getPassword()).isEqualTo("Password123!");
    }

    @Test
    void loginReturnsAccessTokenAndStoresRefreshTokenCookie() throws Exception {
        LoginResponse loginResponse = LoginResponse.builder()
                .accessToken("access-token")
                .expiresIn(900L)
                .user(loginUserResponse())
                .build();
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthService.LoginResult(loginResponse, "refresh-token"));
        when(authService.getRefreshTokenExpirationSeconds()).thenReturn(REFRESH_TOKEN_MAX_AGE_SECONDS);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(asJson(Map.of(
                                "usernameOrEmail", "john",
                                "password", "Password123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=refresh-token")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=" + REFRESH_TOKEN_COOKIE_PATH)))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.username").value("john"));

        ArgumentCaptor<LoginRequest> requestCaptor = ArgumentCaptor.forClass(LoginRequest.class);
        verify(authService).login(requestCaptor.capture());
        assertThat(requestCaptor.getValue().getUsernameOrEmail()).isEqualTo("john");
    }

    @Test
    void refreshTokenReadsCookieAndRotatesRefreshTokenCookie() throws Exception {
        RefreshTokenResponse refreshTokenResponse = RefreshTokenResponse.builder()
                .accessToken("new-access-token")
                .expiresIn(900L)
                .build();
        when(authService.refreshToken("old-refresh-token"))
                .thenReturn(new AuthService.RefreshTokenResult(refreshTokenResponse, "new-refresh-token"));
        when(authService.getRefreshTokenExpirationSeconds()).thenReturn(REFRESH_TOKEN_MAX_AGE_SECONDS);

        mockMvc.perform(post("/auth/refresh-token")
                        .cookie(new Cookie(REFRESH_TOKEN_COOKIE_NAME, "old-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=new-refresh-token")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));

        verify(authService).refreshToken("old-refresh-token");
    }

    @Test
    void meReturnsAuthenticatedUserProfile() throws Exception {
        when(authService.getCurrentUser("john")).thenReturn(MeResponse.builder()
                .id(1L)
                .username("john")
                .email("john@example.com")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.of(2026, 7, 3, 10, 0))
                .build());

        mockMvc.perform(get("/auth/me").principal(authentication("john")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("john"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        verify(authService).getCurrentUser("john");
    }

    @Test
    void changePasswordUsesAuthenticatedUsername() throws Exception {
        when(authService.changePassword(eq("john"), any()))
                .thenReturn(new ChangePasswordResponse("Password changed successfully"));

        mockMvc.perform(put("/auth/password")
                        .principal(authentication("john"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(asJson(Map.of(
                                "currentPassword", "Password123!",
                                "newPassword", "NewPassword123!",
                                "confirmNewPassword", "NewPassword123!"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Password changed successfully"));

        verify(authService).changePassword(eq("john"), any());
    }

    @Test
    void logoutClearsRefreshTokenCookie() throws Exception {
        when(authService.logout("refresh-token")).thenReturn(new LogoutResponse("Logout successfully"));

        mockMvc.perform(post("/auth/logout")
                        .cookie(new Cookie(REFRESH_TOKEN_COOKIE_NAME, "refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Logout successfully"));

        verify(authService).logout("refresh-token");
    }

    @Test
    void registerReturnsBadRequestWhenPayloadIsInvalid() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(asJson(Map.of(
                                "username", "",
                                "email", "invalid-email",
                                "password", "short"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        verify(authService, never()).register(any(RegisterRequest.class));
    }

    @Test
    void loginReturnsAuthErrorResponseWhenServiceRejectsCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenThrow(new AuthException(
                HttpStatus.UNAUTHORIZED,
                "AUTH_INVALID_CREDENTIALS",
                "Invalid username/email or password"
        ));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(asJson(Map.of(
                                "usernameOrEmail", "john",
                                "password", "WrongPassword123"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AUTH_INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.error.message").value("Invalid username/email or password"));
    }

    @Test
    void refreshTokenReturnsServiceUnavailableWhenRedisCannotConnect() throws Exception {
        when(authService.refreshToken("old-refresh-token"))
                .thenThrow(new RedisConnectionFailureException("Unable to connect to Redis"));

        mockMvc.perform(post("/auth/refresh-token")
                        .cookie(new Cookie(REFRESH_TOKEN_COOKIE_NAME, "old-refresh-token")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("REDIS_UNAVAILABLE"))
                .andExpect(jsonPath("$.error.message").value("Redis service is unavailable"));
    }

    private String asJson(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private Authentication authentication(String username) {
        return new UsernamePasswordAuthenticationToken(username, null, List.of());
    }

    private LoginUserResponse loginUserResponse() {
        return LoginUserResponse.builder()
                .id(1L)
                .username("john")
                .email("john@example.com")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
