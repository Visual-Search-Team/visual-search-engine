# Swagger / OpenAPI Documentation

This project uses Swagger through Springdoc OpenAPI.

## Libraries

Configured in `pom.xml`:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>3.0.3</version>
</dependency>
```

Already existing related libraries:

- `spring-boot-starter-webmvc`: exposes REST controllers.
- `spring-boot-starter-security`: protects endpoints and works with Bearer JWT.
- `spring-boot-starter-validation`: validates request DTOs.
- `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson`: creates and verifies JWT tokens.

## Configuration Files

Swagger UI and OpenAPI paths are configured in:

```text
src/main/resources/application.yaml
```

```yaml
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    url: /visual-search/v1/openapi/visual-search-openapi.yaml
    operations-sorter: method
    tags-sorter: alpha
```

OpenAPI Java configuration is in:

```text
src/main/java/com/imagesearch/backend_java/config/OpenApiConfig.java
```

It defines:

- API title, version and description.
- Local server URL: `/visual-search/v1`.
- Bearer JWT security scheme named `bearerAuth`.

The complete OpenAPI YAML file generated from `visual-search-engine-api-docs.md` is:

```text
src/main/resources/static/openapi/visual-search-openapi.yaml
```

## URLs

When the backend is running locally:

- Swagger UI: `http://localhost:8080/visual-search/v1/swagger-ui.html`
- Static OpenAPI YAML: `http://localhost:8080/visual-search/v1/openapi/visual-search-openapi.yaml`
- Generated OpenAPI JSON from current controllers: `http://localhost:8080/visual-search/v1/api-docs`

Swagger UI is configured to load the static YAML so it can show all endpoints listed in `visual-search-engine-api-docs.md`, including Search, Search History and Bookmarks even before their controllers are implemented.

## Authentication in Swagger

The OpenAPI spec defines this security scheme:

```yaml
bearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
```

Protected APIs use:

```yaml
security:
  - bearerAuth: []
```

In Swagger UI, click `Authorize` and enter the access token. Swagger UI will send:

```http
Authorization: Bearer <access_token>
```

Refresh token APIs use the `refreshToken` HttpOnly cookie documented in the OpenAPI YAML.

## API Groups

The static Swagger document contains these tags:

- `Authentication`
- `Search`
- `Search History`
- `Bookmarks`

The endpoint list is based on `visual-search-engine-api-docs.md`.

## Notes

- `AuthController` is currently implemented in Java.
- Search, Search History and Bookmark endpoints are documented in Swagger YAML, but their controllers are not present in the current codebase yet.
- If new controllers are added later, either update `visual-search-openapi.yaml` manually or move to annotation-based Swagger docs on each controller.
