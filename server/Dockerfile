# --- Build stage -------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache dependencies in their own layer, separate from source changes.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src/ src/
RUN mvn -q -B clean package -DskipTests

# --- Runtime stage -------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

RUN groupadd --system nwm && useradd --system --gid nwm --no-create-home nwm
COPY --from=build /build/target/*.jar app.jar
RUN chown nwm:nwm app.jar
USER nwm

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
