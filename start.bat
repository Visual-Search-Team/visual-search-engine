@echo off
echo Dang build va khoi dong he thong tu source code local...
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d
echo Hoan tat!
pause

