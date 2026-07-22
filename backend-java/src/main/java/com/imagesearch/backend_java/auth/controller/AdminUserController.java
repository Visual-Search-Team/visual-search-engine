package com.imagesearch.backend_java.auth.controller;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.auth.dto.UserDto;
import com.imagesearch.backend_java.auth.service.AdminUserService;
import com.imagesearch.backend_java.index.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin Users", description = "Admin APIs for reading user accounts")
@SecurityRequirement(name = "bearerAuth")
@Slf4j(topic = "ADMIN-USER-CONTROLLER")
public class AdminUserController {
    private final AdminUserService adminUserService;

    @Operation(summary = "Get users", description = "API returns paginated user list with optional role/status filters")
    @GetMapping
    public ResponseEntity<BaseResponse<PageResponse<UserDto>>> getUsers(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status
    ) {
        log.info(
                "GET /admin/users: Fetch paginated user list, page={}, size={}, role={}, status={}",
                page,
                size,
                role,
                status
        );
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(BaseResponse.success(adminUserService.getUsers(pageable, role, status)));
    }
}
