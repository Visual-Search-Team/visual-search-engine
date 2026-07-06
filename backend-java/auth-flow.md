# Auth Flow

## 1. JWT la gi, hoat dong nhu the nao

JWT la viet tat cua JSON Web Token. Day la mot chuoi token nho gon, thuong duoc backend tao ra sau khi user dang nhap thanh cong, roi client dung token do de chung minh danh tinh trong cac request tiep theo.

Mot JWT gom 3 phan, ngan cach bang dau cham:

```text
header.payload.signature
```

Vi du hinh dang token:

```text
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqb2huIn0.abcxyz
```

Ba phan nay co y nghia:

- `header`: mo ta thuat toan ky token, vi du `HS256`.
- `payload`: chua thong tin user va token, goi la claims.
- `signature`: chu ky duoc tao tu header, payload va secret key cua server.

Payload cua JWT khong duoc ma hoa mac dinh. Ai co token deu co the decode header va payload de doc thong tin. Vi vay khong nen dat password, refresh token raw, ma bi mat thanh toan, hoac du lieu nhay cam vao claims.

Diem quan trong cua JWT nam o `signature`. Khi server nhan token, server dung cung secret key de verify chu ky. Neu token bi sua payload, chu ky se khong con khop va token bi tu choi.

Trong he thong nay co 2 loai JWT:

- Access token: dung de goi cac API can dang nhap. Token nay duoc gui trong header `Authorization: Bearer <accessToken>`.
- Refresh token: dung de xin access token moi khi access token het han. Token nay duoc luu trong HttpOnly cookie ten `refreshToken`.

Refresh token co them claim `jti`. `jti` la JWT ID, tuc id duy nhat cua tung token. Backend luu `jti` vao Redis de biet refresh token nao con hop le.

Luong tong quat:

1. User dang nhap bang username/email va password.
2. Backend verify password bang BCrypt.
3. Backend tao access token va refresh token.
4. Access token tra ve trong response body.
5. Refresh token duoc set vao HttpOnly cookie.
6. Client goi protected API bang access token.
7. Khi can refresh, browser tu gui cookie `refreshToken` len endpoint refresh.
8. Backend verify refresh token, doc `jti`, doi chieu Redis.
9. Neu Redis co session hop le, backend xoa `jti` cu, tao refresh token moi voi `jti` moi va set lai cookie.

Nho co Redis, refresh token cu se bi revoke sau khi rotate. Neu ai do dung lai refresh token cu, JWT co the van chua het han nhung Redis khong con key `jti`, nen request bi tu choi.

## 2. JWT duoc cau hinh trong du an the nao

Cau hinh nam trong `src/main/resources/application.yaml`:

```yaml
jwt:
  secret: ${JWT_SECRET:...}
  access-token-expiration-ms: ${JWT_ACCESS_TOKEN_EXPIRATION_MS:86400000}
  refresh-token-expiration-ms: ${JWT_REFRESH_TOKEN_EXPIRATION_MS:604800000}
```

Y nghia:

- `jwt.secret`: secret key dung de ky va verify JWT.
- `jwt.access-token-expiration-ms`: thoi gian song cua access token, mac dinh 24 gio.
- `jwt.refresh-token-expiration-ms`: thoi gian song cua refresh token, mac dinh 7 ngay.

Redis duoc cau hinh cung trong `application.yaml`:

```yaml
spring:
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:localhost}
      port: ${SPRING_DATA_REDIS_PORT:6379}
      password: ${SPRING_DATA_REDIS_PASSWORD:}
      timeout: ${SPRING_DATA_REDIS_TIMEOUT:2000ms}
```

Dependency Redis duoc them trong `pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

Class tao va verify JWT la `JwtService`.

Khi tao token, service them cac claims:

- `jti`: id duy nhat cua token.
- `sub`: username.
- `userId`: id cua user.
- `role`: role cua user.
- `tokenType`: `ACCESS` hoac `REFRESH`.
- `iat`: thoi diem tao token.
- `exp`: thoi diem het han token.

Access token duoc tao bang:

```java
jwtService.generateAccessToken(user)
```

Refresh token duoc tao bang:

```java
jwtService.generateRefreshToken(user)
```

Khi verify token:

- `extractAccessTokenClaims(...)` chi chap nhan token co `tokenType = ACCESS`.
- `extractRefreshTokenClaims(...)` chi chap nhan token co `tokenType = REFRESH`.

`JwtAuthenticationFilter` dung `extractAccessTokenClaims(...)`, nen refresh token khong the dung thay access token de goi protected API.

Refresh token duoc quan ly them bang Redis trong `AuthService`:

```text
Redis key: auth:refresh:{jti}
Redis value: userId
TTL: jwt.refresh-token-expiration-ms
```

Khi login:

1. Tao refresh token.
2. Doc `jti` tu token.
3. Luu key `auth:refresh:{jti}` vao Redis voi value la `userId`.
4. Set refresh token vao HttpOnly cookie.

Khi refresh:

1. Doc refresh token tu cookie.
2. Verify JWT va `tokenType = REFRESH`.
3. Lay `jti` va `sub`.
4. Check Redis co key `auth:refresh:{jti}` khong.
5. Check Redis value co khop `userId` cua user khong.
6. Xoa key Redis cu.
7. Tao refresh token moi, luu `jti` moi vao Redis.
8. Set cookie moi.

Khi logout:

1. Doc refresh token tu cookie.
2. Verify token neu co the.
3. Lay `jti`.
4. Xoa key `auth:refresh:{jti}` trong Redis.
5. Clear cookie bang `Max-Age=0`.

Cookie refresh token duoc cau hinh trong `AuthController`:

```java
ResponseCookie.from("refreshToken", refreshToken)
        .httpOnly(true)
        .secure(true)
        .sameSite("Lax")
        .path("/visual-search/v1/auth")
        .maxAge(authService.getRefreshTokenExpirationSeconds())
        .build();
```

`HttpOnly` giup JavaScript tren browser khong doc duoc refresh token truc tiep.

## 3. Cach xac thuc cua API, vi du mot API

Project cau hinh Spring Security theo kieu stateless trong `SecurityConfig`:

- Tat CSRF.
- Khong dung server session: `SessionCreationPolicy.STATELESS`.
- Cho phep public:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh-token`
- Cac API con lai can authentication.
- `JwtAuthenticationFilter` chay truoc `UsernamePasswordAuthenticationFilter`.

Vi du voi API:

```http
GET /visual-search/v1/auth/me
Authorization: Bearer <accessToken>
```

Luong xu ly:

1. Client gui request kem access token trong header `Authorization`.
2. `JwtAuthenticationFilter` doc header.
3. Neu header khong bat dau bang `Bearer `, filter bo qua.
4. Neu co token, filter goi `jwtService.extractAccessTokenClaims(token)`.
5. `JwtService` verify chu ky, kiem tra token chua het han va `tokenType = ACCESS`.
6. Filter lay username tu claim `sub`.
7. Filter lay role tu claim `role`.
8. Filter tao `UsernamePasswordAuthenticationToken`.
9. Filter set authentication vao `SecurityContextHolder`.
10. Request di vao `AuthController.me(...)`.
11. Controller lay username bang `authentication.getName()`.
12. `AuthService.getCurrentUser(username)` lay user trong database va tra ve profile.

Neu access token sai chu ky, het han, sai format, hoac la refresh token, filter se clear security context. Vi `/auth/me` la protected API, Spring Security se tra ve `401 Unauthorized`.

Response loi 401 co dang:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  },
  "timestamp": "2026-07-03T10:15:30+07:00"
}
```

Vi du refresh access token:

```http
POST /visual-search/v1/auth/refresh-token
Cookie: refreshToken=<refreshToken>
```

Client khong can doc refresh token bang JavaScript. Browser tu gui cookie neu request dung domain/path. Backend lay cookie bang `@CookieValue`, verify JWT, doi chieu Redis bang `jti`, rotate refresh token va tra access token moi.
