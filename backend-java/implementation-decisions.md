# Implementation Decisions and Tradeoffs

Tai lieu nay tong hop cac quyet dinh ky thuat nam ngoai API spec ban dau, cac diem dang khac voi yeu cau, va tradeoff giua toc do, don gian, va huong hop ly hon cho production.

## 1. JWT Secret Dang Co Default Trong `application.yaml`

### Hien tai

`application.yaml` dang co default secret:

```yaml
jwt:
  secret: ${JWT_SECRET:1TjXchw5FloESb63Kc+DFhTARvpWL4jUGCwfGWxuG5SIf/1y/LgJxHnMqaF6A/ij}
```

### Vi sao lam vay

De project co the chay local ngay ma khong can set environment variable truoc.

### Tradeoff

- Toc do: tot, dev moi clone project co the chay nhanh.
- Don gian: tot, it config hon.
- Bao mat: kem neu secret that bi commit vao repository.

### Nen thay doi

Production nen bo default secret that, chi de:

```yaml
jwt:
  secret: ${JWT_SECRET}
```

Va set `JWT_SECRET` qua environment variable hoac secret manager.

## 2. Refresh Token Chua Luu Database

### Hien tai

Refresh token la JWT, duoc set vao HttpOnly cookie. Khi refresh, server verify JWT va tao access token moi + refresh token moi.

Chua co bang `refresh_tokens`.

### Khac voi spec

API docs co nhac:

- refresh-token rotation
- revoked token
- error `AUTH_REFRESH_TOKEN_REVOKED`

Hien tai chi co rotation cookie, chua co revoke tracking server-side.

### Tradeoff

- Toc do: tot, implement nhanh.
- Don gian: tot, khong can them entity/repository/migration.
- Bao mat: trung binh, token bi lo van dung duoc den khi het han neu server khong co blacklist/revoke store.
- Dung spec: chua day du.

### Nen thay doi

Them bang:

```text
refresh_tokens
  id
  user_id
  token_hash
  expires_at
  revoked_at
  created_at
  replaced_by_token_hash
```

Khi login/refresh:

1. Luu hash cua refresh token.
2. Khi refresh, check token hash con active khong.
3. Revoke token cu.
4. Tao token moi.

Khi logout:

1. Revoke refresh token trong DB.
2. Xoa cookie.

## 3. Logout Hien Chi Xoa Cookie

### Hien tai

`POST /auth/logout` clear cookie:

```java
maxAge(0)
```

Service tra message `Logout successfully`.

### Khac voi spec

Spec ghi server thu hoi refresh token. Hien tai server chua thu hoi trong DB vi refresh token chua duoc persist.

### Tradeoff

- Toc do: tot.
- Don gian: tot.
- Bao mat: chua du neu refresh token bi copy truoc khi logout.

### Nen thay doi

Sau khi co bang `refresh_tokens`, logout nen revoke token hien tai.

## 4. Access Token Co `tokenType = ACCESS`

### Hien tai

JWT claims gom:

```text
sub
userId
role
tokenType
iat
exp
```

User yeu cau ban dau la:

```text
sub
userId
role
iat
exp
```

### Vi sao them `tokenType`

De phan biet access token va refresh token bang cung `JwtService`.

### Tradeoff

- Toc do: tot.
- Don gian: tot.
- Hop ly: tot, tranh viec access token bi gui vao endpoint refresh.
- Khac spec: co them claim ngoai spec.

### Nen giu hay bo

Nen giu. Claim nay khong lam hong client va tang do ro rang cho server.

## 5. Refresh Token Cung La JWT

### Hien tai

Access token va refresh token deu la JWT, cung dung `jwt.secret`.

### Tradeoff

- Toc do: tot.
- Don gian: tot.
- Bao mat: chap nhan duoc cho giai do dau.
- Production: nen can nhac secret rieng hoac token opaque neu muon revoke tot hon.

### Lua chon khac

Dung opaque random token:

```text
refreshToken = random 256-bit string
```

Chi luu hash trong DB. Cach nay revoke va rotation ro rang hon, nhung can DB lookup moi lan refresh.

## 6. Cookie Refresh Token Dang `Secure(true)`

### Hien tai

Cookie refresh token:

```java
.httpOnly(true)
.secure(true)
.sameSite("Lax")
.path("/visual-search/v1/auth")
```

### Tradeoff

- Bao mat: tot cho HTTPS.
- Local HTTP: browser co the khong luu/gui cookie `Secure` tren `http://localhost` tuy browser co the co ngoai le tuy moi truong.

### Nen thay doi

Nen cau hinh theo environment:

```yaml
auth:
  cookie:
    secure: ${AUTH_COOKIE_SECURE:true}
```

Local dev co the set:

```text
AUTH_COOKIE_SECURE=false
```

Production bat buoc `true`.

## 7. Swagger UI Doc Duoc Tao Bang Static OpenAPI YAML

### Hien tai

Them:

```text
src/main/resources/static/openapi/visual-search-openapi.yaml
```

Swagger UI load file nay qua:

```yaml
springdoc:
  swagger-ui:
    url: /visual-search/v1/openapi/visual-search-openapi.yaml
```

### Vi sao lam vay

Trong code hien tai moi co `AuthController`. Cac API Search, Search History, Bookmarks co trong `visual-search-engine-api-docs.md` nhung chua co controller.

Neu chi dung annotation scan tu controller, Swagger chi hien Authentication API.

### Tradeoff

- Toc do: tot, co Swagger day du ngay theo docs.
- Don gian: trung binh, phai maintain YAML thu cong.
- Dung voi code runtime: chua dam bao, vi YAML co endpoint chua implement.

### Nen thay doi

Khi implement du controller, nen chuyen dan sang annotation-based docs:

```java
@Operation
@ApiResponse
@SecurityRequirement
```

Hoac generate OpenAPI tu test/contract de tranh drift giua docs va code.

## 8. Them `springdoc-openapi-starter-webmvc-ui:3.0.3`

### Hien tai

Dependency trong `pom.xml`:

```xml
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>3.0.3</version>
</dependency>
```

### Vi sao chon 3.0.3

Day la latest release tren Maven Central metadata tai thoi diem cau hinh va compile thanh cong voi project.

### Tradeoff

- Toc do: tot.
- Hop ly: tot vi compile pass.
- Rui ro: Spring Boot 4.1.0 con moi, can test runtime Swagger UI.

### Nen kiem tra them

Chay app va mo:

```text
http://localhost:8080/visual-search/v1/swagger-ui.html
```

Neu runtime loi, can lock ve version springdoc phu hop hon hoac check release note.

## 9. `OpenApiConfig` Vua Co Java Config Vua Co Static YAML

### Hien tai

Co ca:

```text
src/main/java/com/imagesearch/backend_java/config/OpenApiConfig.java
src/main/resources/static/openapi/visual-search-openapi.yaml
```

### Vi sao

- `OpenApiConfig` cau hinh metadata va Bearer JWT cho generated docs.
- Static YAML chua full API spec tu markdown.

### Tradeoff

- Toc do: tot.
- Don gian: trung binh, co 2 nguon OpenAPI.
- Rui ro: generated `/api-docs` va static YAML co the khac nhau.

### Nen thay doi

Chon mot nguon chinh:

1. Neu uu tien code-first: dung annotation tren controller, bo static YAML.
2. Neu uu tien spec-first: giu YAML, generate controller/interface tu OpenAPI.

Hien tai dang nghieng ve spec-first tam thoi vi nhieu API chua co code.

## 10. `BaseResponse` Nam O `auth.dto`

### Hien tai

`BaseResponse` nam tai:

```text
src/main/java/com/imagesearch/backend_java/auth/dto/BaseResponse.java
```

Nhung response standard ap dung cho toan bo API, khong chi auth.

### Tradeoff

- Toc do: tot, tao nhanh trong module dang lam.
- Don gian: tam thoi chap nhan.
- Thiet ke module: chua hop ly neu Search/Bookmark cung dung response nay.

### Nen thay doi

Chuyen sang package chung:

```text
com.imagesearch.backend_java.common.dto.BaseResponse
```

Va error model:

```text
com.imagesearch.backend_java.common.dto.ErrorResponse
```

Sau do update import trong controller/exception.

## 11. `GlobalExceptionHandler` Nam Trong `auth.exception`

### Hien tai

File:

```text
src/main/java/com/imagesearch/backend_java/auth/exception/GlobalExceptionHandler.java
```

Nhung class nay xu ly exception global cho ca app.

### Tradeoff

- Toc do: tot.
- Don gian: tam thoi chap nhan.
- Kien truc: chua dung boundary module.

### Nen thay doi

Chuyen sang:

```text
com.imagesearch.backend_java.common.exception.GlobalExceptionHandler
```

Auth-specific exception co the giu trong:

```text
com.imagesearch.backend_java.auth.exception.AuthException
```

## 12. Auth DTO Da Tach Theo Tung API

### Hien tai

Response DTO:

```text
RegisterResponse
LoginResponse
RefreshTokenResponse
MeResponse
ChangePasswordResponse
LogoutResponse
```

### Vi sao

Theo yeu cau: response cua tung API nen co DTO rieng.

### Tradeoff

- Ro rang: tot.
- Bao tri: tot khi moi endpoint co shape rieng.
- Duplication: co lap lai field user giua `RegisterResponse` va `MeResponse`.

### Nen giu hay gop

Hien tai nen giu tach rieng vi API docs dang mo ta response theo tung endpoint. Khi duplication tang, co the dung mapper/helper hoac common nested DTO, nhung khong nen gop qua som.

## 13. Password Policy Moi Chi Validate Do Dai

### Hien tai

Request DTO chi validate:

```java
@Size(min = 8, max = 100)
```

### Khac voi vi du trong docs

Docs dung password mau:

```text
StrongPassword@123
```

Nhung chua enforce uppercase/lowercase/digit/special char.

### Tradeoff

- Toc do: tot.
- UX: don gian.
- Bao mat: chua chat.

### Nen thay doi

Them custom validator hoac regex:

```text
it nhat 8 ky tu, co chu hoa, chu thuong, so, ky tu dac biet
```

Va thong nhat error code `VALIDATION_ERROR`.

## 14. Access Token Expiry Khac Vi Du Trong API Docs

### Hien tai

User yeu cau access token het han sau 24 gio:

```yaml
access-token-expiration-ms: 86400000
```

Response `expiresIn` se la:

```text
86400
```

### Khac voi docs

Trong `visual-search-engine-api-docs.md`, vi du login/refresh ghi:

```json
"expiresIn": 900
```

### Tradeoff

- Theo yeu cau moi nhat: dung.
- Theo docs cu: khac.

### Nen thay doi

Cap nhat API docs/Swagger example tu `900` sang `86400`, hoac neu muon bao mat hon thi quay lai 15 phut access token + refresh token rotation DB.

## 15. Thu Muc Luu Anh Nen Dat Ngoai Source Code

### De xuat

Khong luu upload trong:

```text
src/main/resources
src/main/resources/static
```

Nen luu runtime data o ngoai source:

```text
D:/TTS/visual-search-engine/storage/
  images/
  thumbnails/
  search-queries/
```

### Tradeoff

- Toc do: tot, de lam local.
- Hop ly: tot, khong mat file khi rebuild.
- Production: can object storage hoac mounted volume.

### Nen config

```yaml
storage:
  base-path: ${STORAGE_BASE_PATH:D:/TTS/visual-search-engine/storage}
```

Production co the thay bang S3/MinIO/Qdrant metadata URL tuy kien truc.

## 16. Chua Co Controller Cho Search, Search History, Bookmarks

### Hien tai

Swagger YAML da co endpoint theo docs, nhung code chi co:

```text
AuthController
```

### Tradeoff

- Docs day du: tot cho frontend xem truoc contract.
- Runtime: neu goi endpoint Search/Bookmark se chua co handler.

### Nen thay doi

Implement theo thu tu:

1. Search image/text.
2. Search history.
3. Bookmarks.
4. Dong bo DTO response voi Swagger YAML.

## 17. Nen Them Resource Handler De Serve Anh

### Hien tai

API docs tra URL nhu:

```text
/images/1001
/thumbnails/1001.jpg
/search-queries/501/query-image.jpg
```

Nhung project chua co controller/resource handler serve file.

### Tradeoff

- Chua lam: nhanh hon cho auth/JWT/Swagger.
- Can co: de frontend hien thi anh.

### Nen thay doi

Them config:

```java
WebMvcConfigurer#addResourceHandlers
```

Hoac controller stream file co auth/permission check.

Neu anh public sau khi authenticated, controller stream file an toan hon static resource handler.

## 18. Ket Luan

Trang thai hien tai phu hop cho giai do scaffold backend:

- Auth/JWT da co luong chay chinh.
- Swagger da co full contract theo docs.
- Response DTO auth da tach theo tung API.
- Exception response co format thong nhat.

Nhung de production-ready, cac viec nen uu tien tiep theo:

1. Chuyen `BaseResponse` va `GlobalExceptionHandler` sang package common.
2. Luu refresh token vao DB va revoke khi logout/rotation.
3. Tach secret ra khoi source config.
4. Them storage config va resource serving cho anh.
5. Implement Search, Search History, Bookmarks theo OpenAPI YAML.
6. Cap nhat docs example `expiresIn` tu `900` sang `86400` neu giu yeu cau access token 24 gio.
