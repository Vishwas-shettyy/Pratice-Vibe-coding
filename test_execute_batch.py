import psycopg2
from psycopg2.extras import execute_batch

try:
    conn = psycopg2.connect("postgres://fake:fake@localhost:5432/fake")
except Exception:
    print("Could not connect")
