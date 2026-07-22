package com.imagesearch.backend_java.auth.repository;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<User> findAllByRoleOrderByCreatedAtDesc(UserRole role, Pageable pageable);

    Page<User> findAllByStatusOrderByCreatedAtDesc(UserStatus status, Pageable pageable);

    Page<User> findAllByRoleAndStatusOrderByCreatedAtDesc(UserRole role, UserStatus status, Pageable pageable);
}
