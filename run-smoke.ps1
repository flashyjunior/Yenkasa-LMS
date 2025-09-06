# Quick smoke test: login -> get privileges -> get quiz-results
$body = @{ username = 'student'; password = 'Student123!' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:5124/api/lms/login' -ContentType 'application/json' -Body $body
Write-Host 'Login response:'; $login | ConvertTo-Json
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host 'Privileges:'
Invoke-RestMethod -Uri 'http://localhost:5124/api/lms/users/me/privileges' -Headers $headers | ConvertTo-Json | Write-Host
Write-Host 'Quiz Results:'
Invoke-RestMethod -Uri 'http://localhost:5124/api/lms/quiz-results' -Headers $headers | ConvertTo-Json | Write-Host
