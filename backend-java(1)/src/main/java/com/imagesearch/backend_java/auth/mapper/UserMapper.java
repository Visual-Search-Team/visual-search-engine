package com.imagesearch.backend_java.auth.mapper;

import com.imagesearch.backend_java.auth.dto.UserDto;
import com.imagesearch.backend_java.auth.dto.response.LoginUserResponse;
import com.imagesearch.backend_java.auth.dto.response.MeResponse;
import com.imagesearch.backend_java.auth.dto.response.RegisterResponse;
import com.imagesearch.backend_java.auth.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public UserDto toDto(User user) {
        if (user == null) {
            return null;
        }

        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public RegisterResponse toRegisterResponse(User user) {
        if (user == null) {
            return null;
        }

        return RegisterResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    public MeResponse toMeResponse(User user) {
        if (user == null) {
            return null;
        }

        return MeResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    public LoginUserResponse toLoginUserResponse(User user) {
        if (user == null) {
            return null;
        }

        return LoginUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .build();
    }
}
