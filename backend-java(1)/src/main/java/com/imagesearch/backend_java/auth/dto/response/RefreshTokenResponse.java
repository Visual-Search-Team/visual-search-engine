package com.imagesearch.backend_java.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenResponse {
    private String accessToken;

    @Builder.Default
    private String tokenType = "Bearer";

    private long expiresIn;
}
