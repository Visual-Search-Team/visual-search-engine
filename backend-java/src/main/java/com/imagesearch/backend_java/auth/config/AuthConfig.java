package com.imagesearch.backend_java.auth.config;

import com.imagesearch.backend_java.auth.common.UserRole;
import com.imagesearch.backend_java.auth.common.UserStatus;
import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
@Slf4j(topic = "AUTH-APP-CONFIG")
public class AuthConfig {
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@example.com}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Bean
    ApplicationRunner adminAccountInitializer(UserRepository userRepository) {
        return args -> createAdminAccountIfMissing(userRepository);
    }

    private void createAdminAccountIfMissing(UserRepository userRepository) {
        if (userRepository.existsByUsername(adminUsername)) {
            log.info("Admin account already exists, username={}", adminUsername);
            return;
        }

        if (userRepository.existsByEmail(adminEmail)) {
            log.warn("Skipped admin account creation because email already exists, email={}", adminEmail);
            return;
        }

        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();

        userRepository.save(admin);
        log.warn("Default admin account has been created, username={}. Please change the default password.", adminUsername);
    }
}
