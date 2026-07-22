package com.imagesearch.backend_java.auth.service;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.dto.UserDto;
import com.imagesearch.backend_java.auth.mapper.UserMapper;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.index.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "ADMIN-USER-SERVICE")
public class AdminUserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public PageResponse<UserDto> getUsers(Pageable pageable, UserRole role, UserStatus status) {
        log.info(
                "Entered getUsers service, page={}, size={}, role={}, status={}",
                pageable.getPageNumber(),
                pageable.getPageSize(),
                role,
                status
        );

        var usersPage = role != null && status != null
                ? userRepository.findAllByRoleAndStatusOrderByCreatedAtDesc(role, status, pageable)
                : role != null
                    ? userRepository.findAllByRoleOrderByCreatedAtDesc(role, pageable)
                    : status != null
                        ? userRepository.findAllByStatusOrderByCreatedAtDesc(status, pageable)
                        : userRepository.findAllByOrderByCreatedAtDesc(pageable);

        var users = usersPage.getContent()
                .stream()
                .map(userMapper::toDto)
                .toList();

        PageResponse<UserDto> response = PageResponse.of(
                users,
                usersPage.getNumber(),
                usersPage.getSize(),
                usersPage.getTotalElements()
        );

        log.info(
                "Completed getUsers service, page={}, size={}, totalElements={}",
                response.getPage(),
                response.getSize(),
                response.getTotalElements()
        );
        return response;
    }
}
