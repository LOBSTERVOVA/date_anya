package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.EmailMessage;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    @Value("${app.system.email}")
    private String fromEmail;

    private final JavaMailSender mailSender;

    public void sendEmail(EmailMessage mailMessage) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "utf-8");

        helper.setFrom(fromEmail);
        helper.setTo(mailMessage.getToEmail());
        helper.setText(mailMessage.getBody(), true);
        helper.setSubject(mailMessage.getTitle());

        if (mailMessage.getCopy() != null && !mailMessage.getCopy().isBlank()) {
            helper.setCc(mailMessage.getCopy());
        }

        mailSender.send(message);
    }
}
