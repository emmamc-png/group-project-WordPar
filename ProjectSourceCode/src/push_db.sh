
#!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://wakeupjoel:bq2kb2Fj1Dc3BDVQhCNDNjVqlzGiw4zU@dpg-d4fm32ali9vc73ai890g-a.oregon-postgres.render.com/users_db_t42b"

# Execute each .sql file in the directory
for file in init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done