package com.imagesearch.backend_java.auth.controller;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.dto.UserDto;
import com.imagesearch.backend_java.auth.service.AdminUserService;
import com.imagesearch.backend_java.index.dto.PageResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    @Mock
    private AdminUserService adminUserService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminUserController(adminUserService)).build();
    }

    @Test
        void getUsersReturnsPaginatedUserList() throws Exception {
        List<UserDto> users = List.of(
            UserDto.builder()
                .id(1L)
                .username("admin")
                .email("admin@example.com")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.of(2026, 7, 21, 9, 0))
                .updatedAt(LocalDateTime.of(2026, 7, 21, 9, 0))
                .build(),
            UserDto.builder()
                .id(2L)
                .username("user1")
                .email("user1@example.com")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.of(2026, 7, 20, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 7, 20, 8, 0))
                .build()
        );
        when(adminUserService.getUsers(any(Pageable.class), eq(UserRole.ADMIN), eq(UserStatus.ACTIVE)))
            .thenReturn(PageResponse.of(users, 0, 2, 5));

        mockMvc.perform(get("/admin/users")
                .param("page", "0")
                .param("size", "2")
                .param("role", "ADMIN")
                .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(2))
            .andExpect(jsonPath("$.data.totalElements").value(5))
            .andExpect(jsonPath("$.data.totalPages").value(3))
            .andExpect(jsonPath("$.data.hasNext").value(true))
            .andExpect(jsonPath("$.data.hasPrevious").value(false))
            .andExpect(jsonPath("$.data.content.length()").value(2))
            .andExpect(jsonPath("$.data.content[0].username").value("admin"))
            .andExpect(jsonPath("$.data.content[0].role").value("ADMIN"))
            .andExpect(jsonPath("$.data.content[1].username").value("user1"));

        verify(adminUserService).getUsers(any(Pageable.class), eq(UserRole.ADMIN), eq(UserStatus.ACTIVE));
    }
}
