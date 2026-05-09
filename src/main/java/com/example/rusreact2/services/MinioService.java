package com.example.rusreact2.services;

import io.minio.*;
import io.minio.errors.*;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

@Slf4j
@Service
@PropertySource("classpath:application.properties")
public class MinioService {
    private final MinioClient minioClient;
    private final String bucket;

    @SneakyThrows
    public MinioService(MinioClient minioClient, @Value("${minio.bucket}") String bucket) {
        this.minioClient = minioClient;
        this.bucket = bucket;
        log.info("bucket: {}", this.bucket);
        if (!this.minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            this.minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    public String uploadStream(InputStream inputStream, String fileName, String path, String contentType) {
        long startMillis = System.currentTimeMillis();

        try {
            // Генерация уникального имени для файла
            String extension = FilenameUtils.getExtension(fileName);
            String uid = UUID.randomUUID().toString() + (extension.isEmpty() ? "" : "." + extension);
            // Убедимся, что путь заканчивается на '/'
            path = path.endsWith("/") ? path : path + "/";
            // Составление полного имени объекта
            String objectName = path + uid;
            // Отправка объекта в MinIO
            ObjectWriteResponse response = minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket) // Указываем бакет
                            .object(objectName) // Путь и имя объекта
                            .stream(inputStream, inputStream.available(), -1) // Передача потока с неизвестным размером частей
                            .contentType(contentType) // MIME-тип файла
                            .build()
            );

            log.info("File [{}] successfully uploaded to bucket [{}], path [{}]", fileName, bucket, objectName);
            log.info("Upload execution time: {} ms", System.currentTimeMillis() - startMillis);
            // Возвращаем полный путь к объекту в MinIO
            return "/" + bucket + "/" + objectName;
        } catch (Exception e) {
            log.error("Error uploading file [{}] to bucket [{}]: {}", fileName, bucket, e.getMessage());
            return ""; // Пустая строка в случае ошибки
        }
    }

    public String uploadFile(File file, String url, String type) throws IOException {
        try (FileInputStream fileInputStream = new FileInputStream(file)) {
            ObjectWriteResponse response = minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(url)
                            .stream(fileInputStream, file.length(), -1)
                            .contentType(type)
                            .build()
            );
            log.info("minio response [{}]", response);
            return "/" + bucket +  response.object();
        } catch (Exception exception) {
            log.error("exception throw [{}]", exception.getMessage());
            return "";
        }
    }

    public void deleteFile(String url){
        String correctUrl = url.substring(bucket.length() + 2);
        log.info("correct url is {}", correctUrl);
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(correctUrl).build());
        } catch (ErrorResponseException | InsufficientDataException | InternalException | InvalidKeyException |
                 InvalidResponseException | IOException | NoSuchAlgorithmException | ServerException |
                 XmlParserException e) {
            log.error("cannot delete file because: {}", e.getMessage());
        }
    }
}