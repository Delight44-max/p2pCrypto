package com.detech;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DeTechApplication {
    public static void main(String[] args) {
        SpringApplication.run(DeTechApplication.class, args);
    }
}
