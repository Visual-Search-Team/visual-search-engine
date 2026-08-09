@echo off
echo Dang kiem tra va build lai he thong (se hoi lau neu co thu vien moi)...
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
echo Hoan tat!
pause
