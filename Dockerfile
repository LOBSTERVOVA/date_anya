# Стадия сборки
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY gradlew gradlew.bat ./
COPY gradle/ gradle/
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew
# Скачиваем зависимости (кэшируется)
RUN ./gradlew dependencies --no-daemon || true
COPY src/ src/
RUN ./gradlew bootJar --no-daemon

# Стадия запуска
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
