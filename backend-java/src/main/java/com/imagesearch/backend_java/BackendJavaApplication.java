package com.imagesearch.backend_java;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableJpaAuditing
@EnableScheduling
@SpringBootApplication
public class BackendJavaApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendJavaApplication.class, args);
	}

}
