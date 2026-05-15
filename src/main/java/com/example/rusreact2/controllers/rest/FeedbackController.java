package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.EmailMessage;
import com.example.rusreact2.data.dto.FeedbackRequest;
import com.example.rusreact2.services.EmailService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FeedbackController {

    private final EmailService emailService;

    @Value("${app.system.email}")
    private String fromEmail;

    private static final String NOTIFY_EMAIL = "ya.vovabalashev2002@gmail.com";

    /** Мгновенная отправка выбранного места — всегда на почту автора */
    @PostMapping("/choice")
    public ResponseEntity<Map<String, Object>> notifyChoice(@RequestBody Map<String, String> body) {
        String idea = body.getOrDefault("idea", "не указана");

        System.out.println("[LOG] 💘 Выбрано место: " + idea);

        String htmlBody = """
                <h2>💘 Девушка выбрала вариант!</h2>
                <p><strong>Что выбрано:</strong> %s</p>
                """.formatted(escapeHtml(idea));

        EmailMessage msg = EmailMessage.builder()
                .toEmail(NOTIFY_EMAIL)
                .title("💘 Выбрано: " + idea)
                .body(htmlBody)
                .build();

        try {
            emailService.sendEmail(msg);
            System.out.println("[LOG] ✅ Письмо о выборе отправлено на " + NOTIFY_EMAIL);
        } catch (MessagingException e) {
            System.err.println("[LOG] ❌ Ошибка отправки письма о выборе: " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("ok", false, "message", "Ошибка отправки"));
        }

        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/feedback")
    public ResponseEntity<Map<String, Object>> sendFeedback(@RequestBody FeedbackRequest request) {
        System.out.println("[LOG] 📧 Попытка отправки отзыва. Почта: " + request.getEmail()
                + ", Идеи: " + request.getIdeas() + ", Текст: " + request.getMessage());

        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("ok", false, "message", "Нужен корректный email"));
        }

        String body = """
                <h2>💌 Новый отзыв на варианты свиданий</h2>
                <p><strong>Почта девушки:</strong> %s</p>
                <p><strong>Выбранные идеи:</strong> %s</p>
                <p><strong>Комментарий:</strong></p>
                <p style="white-space:pre-wrap">%s</p>
                """.formatted(
                escapeHtml(request.getEmail()),
                escapeHtml(request.getIdeas() != null ? request.getIdeas() : "не указаны"),
                escapeHtml(request.getMessage() != null ? request.getMessage() : "—")
        );

        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(NOTIFY_EMAIL)
                .title("💘 Отзыв на свидание от " + request.getEmail())
                .body(body)
                .build();

        try {
            emailService.sendEmail(emailMessage);
            System.out.println("[LOG] ✅ Отзыв успешно отправлен на " + NOTIFY_EMAIL);
        } catch (MessagingException e) {
            System.err.println("[LOG] ❌ Ошибка отправки отзыва: " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("ok", false, "message", "Ошибка отправки: " + e.getMessage()));
        }

        return ResponseEntity.ok(Map.of("ok", true, "message", "Спасибо! Я получил твой отзыв и скоро отвечу 💌"));
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
