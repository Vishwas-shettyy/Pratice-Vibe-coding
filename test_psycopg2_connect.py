import psycopg2

try:
    conn = psycopg2.connect("postgres://user:pass@localhost/db")
    print("Connected")
except Exception as e:
    print("EXCEPTION:", repr(e))
