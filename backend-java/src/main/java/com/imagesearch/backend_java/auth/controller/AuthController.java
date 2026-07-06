package com.imagesearch.backend_java.auth.controller;

import com.imagesearch.backend_java.auth.dto.request.ChangePasswordRequest;
import com.imagesearch.backend_java.auth.dto.request.LoginRequest;
import com.imagesearch.backend_java.auth.dto.request.RegisterRequest;
import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.auth.dto.response.ChangePasswordResponse;
import com.imagesearch.backend_java.auth.dto.response.LoginResponse;
import com.imagesearch.backend_java.auth.dto.response.LogoutResponse;
import com.imagesearch.backend_java.auth.dto.response.MeResponse;
import com.imagesearch.backend_java.auth.dto.response.RefreshTokenResponse;
import com.imagesearch.backend_java.auth.dto.response.RegisterResponse;
import com.imagesearch.backend_java.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "APIs for account registration, login and session management")
public class AuthController {
    private static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    private static final String REFRESH_TOKEN_COOKIE_PATH = "/visual-search/v1/auth";

    private final AuthService authService;

    @Operation(summary = "Register user", description = "API creates a new user account with default USER role")
    @PostMapping("/register")
    public ResponseEntity<BaseResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse data = authService.register(request);
        BaseResponse<RegisterResponse> response = BaseResponse.<RegisterResponse>builder()
                .success(true)
                .data(data)
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @Operation(summary = "Login user", description = "API authenticates user credentials and returns an access token")
    @PostMapping("/login")
    public ResponseEntity<BaseResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse servletResponse
    ) {
        AuthService.LoginResult result = authService.login(request);
        addRefreshTokenCookie(servletResponse, result.refreshToken());

        BaseResponse<LoginResponse> response = BaseResponse.<LoginResponse>builder()
                .success(true)
                .data(result.response())
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Refresh access token",
            description = "API rotates the refresh token cookie and returns a new access token"
    )
    @PostMapping("/refresh-token")
    public ResponseEntity<BaseResponse<RefreshTokenResponse>> refreshToken(
            @CookieValue(value = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse servletResponse
    ) {
        AuthService.RefreshTokenResult result = authService.refreshToken(refreshToken);
        addRefreshTokenCookie(servletResponse, result.refreshToken());

        BaseResponse<RefreshTokenResponse> response = BaseResponse.<RefreshTokenResponse>builder()
                .success(true)
                .data(result.response())
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get current user", description = "API retrieves the authenticated user profile")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    public ResponseEntity<BaseResponse<MeResponse>> me(Authentication authentication) {
        MeResponse data = authService.getCurrentUser(authentication.getName());
        BaseResponse<MeResponse> response = BaseResponse.<MeResponse>builder()
                .success(true)
                .data(data)
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Change password", description = "API changes the authenticated user's password")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/password")
    public ResponseEntity<BaseResponse<ChangePasswordResponse>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        ChangePasswordResponse data = authService.changePassword(authentication.getName(), request);
        BaseResponse<ChangePasswordResponse> response = BaseResponse.<ChangePasswordResponse>builder()
                .success(true)
                .data(data)
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Logout user", description = "API clears the refresh token cookie for the current session")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/logout")
    public ResponseEntity<BaseResponse<LogoutResponse>> logout(
            @CookieValue(value = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse servletResponse
    ) {
        clearRefreshTokenCookie(servletResponse);

        LogoutResponse data = authService.logout(refreshToken);
        BaseResponse<LogoutResponse> response = BaseResponse.<LogoutResponse>builder()
                .success(true)
                .data(data)
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    // Refresh token is stored in an HttpOnly cookie so JavaScript cannot read it directly.
    private void addRefreshTokenCookie(HttpServletResponse servletResponse, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(authService.getRefreshTokenExpirationSeconds())
                .build();
        servletResponse.addHeader("Set-Cookie", cookie.toString());
    }

    // Expiring the cookie keeps logout stateless and aligned with JWT-based authentication.
    private void clearRefreshTokenCookie(HttpServletResponse servletResponse) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(0)
                .build();
        servletResponse.addHeader("Set-Cookie", cookie.toString());
    }
}
