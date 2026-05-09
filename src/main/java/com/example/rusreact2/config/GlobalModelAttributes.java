package com.example.rusreact2.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAttributes {

    @Value("${app.cdn:}")
    private String cdn;

    @ModelAttribute("cdn")
    public String cdn() {
        return cdn;
    }
}
