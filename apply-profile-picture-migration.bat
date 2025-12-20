@echo off
REM Apply profile picture migration
REM Replace the connection string with your actual Supabase connection details from .env file

echo This script will apply the profile_picture migration to your database.
echo.
echo Please update this script with your Supabase connection details from your .env file:
echo - NEXT_PUBLIC_SUPABASE_URL
echo - SUPABASE_SERVICE_ROLE_KEY or connection string
echo.
pause

REM Example command (update with your actual details):
REM psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f "supabase\migrations\014_add_profile_picture.sql"

echo Please run the migration manually using one of these methods:
echo 1. Supabase Dashboard SQL Editor
echo 2. psql command line tool
pause
