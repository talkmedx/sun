# Komal's Makeovers — ER Diagram

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o{ batches : creates
    users ||--o{ students : creates
    users ||--o{ expenses : records
    users ||--o{ fee_transactions : records
    users ||--o{ notifications : receives
    users ||--o{ documents : uploads

    batches ||--o{ students : contains
    batches ||--o{ fee_transactions : "fees for"
    batches ||--o{ expenses : "expenses for"
    batches ||--o{ admissions : "applies to"

    students ||--o{ fee_transactions : pays
    students ||--o{ student_products : buys
    students ||--o| admissions : "from admission"

    vendors ||--o{ expenses : supplies
    vendors ||--o{ vendor_credits : has
    vendors ||--o{ products : supplies

    products ||--o{ product_price_history : "price changes"
    products ||--o{ student_products : sold_as

    product_price_history ||--o{ student_products : "locks price"

    expenses ||--o| vendor_credits : "reduces credit"

    admissions ||--o| students : "becomes"

    users {
        bigint id PK
        varchar email UK
        varchar password_hash
        enum role
        text refresh_token
        datetime deleted_at
    }

    batches {
        bigint id PK
        varchar name UK
        decimal course_fee
        decimal offer_fee
        date start_date
        date end_date
        enum status
        datetime deleted_at
    }

    students {
        bigint id PK
        varchar student_code UK
        varchar phone UK
        bigint batch_id FK
        decimal fees_committed
        decimal fees_paid
        enum status
        datetime deleted_at
    }

    admissions {
        bigint id PK
        varchar phone
        bigint batch_id FK
        enum status
        varchar edit_token
        bigint student_id FK
        datetime deleted_at
    }

    fee_transactions {
        bigint id PK
        bigint student_id FK
        bigint batch_id FK
        decimal amount
        date payment_date
        varchar financial_year
        datetime deleted_at
    }

    vendors {
        bigint id PK
        varchar name UK
        varchar phone UK
        decimal pending_credit
        datetime deleted_at
    }

    vendor_credits {
        bigint id PK
        bigint vendor_id FK
        decimal amount
        enum type
        bigint expense_id FK
        datetime deleted_at
    }

    expenses {
        bigint id PK
        varchar title
        decimal amount
        bigint batch_id FK
        bigint vendor_id FK
        tinyint use_vendor_credit
        varchar financial_year
        datetime deleted_at
    }

    products {
        bigint id PK
        varchar sku UK
        varchar name UK
        bigint vendor_id FK
        decimal cost_price
        decimal selling_price
        int quantity_available
        int quantity_sold
        datetime deleted_at
    }

    product_price_history {
        bigint id PK
        bigint product_id FK
        decimal cost_price
        decimal selling_price
        datetime effective_from
        datetime effective_to
    }

    student_products {
        bigint id PK
        bigint student_id FK
        bigint product_id FK
        bigint price_history_id FK
        decimal unit_selling_price
        int quantity
        datetime deleted_at
    }

    documents {
        bigint id PK
        enum entity_type
        bigint entity_id
        varchar file_url
        datetime deleted_at
    }

    notifications {
        bigint id PK
        bigint user_id FK
        varchar title
        enum type
        tinyint is_read
        datetime deleted_at
    }

    settings {
        bigint id PK
        varchar setting_key UK
        text setting_value
    }
```

## Relationship Summary

| Parent | Child | Cardinality | On Delete |
|--------|-------|-------------|-----------|
| users | batches | 1:N | SET NULL |
| batches | students | 1:N | RESTRICT |
| students | fee_transactions | 1:N | RESTRICT |
| vendors | expenses | 1:N | SET NULL |
| vendors | vendor_credits | 1:N | RESTRICT |
| vendors | products | 1:N | SET NULL |
| products | product_price_history | 1:N | CASCADE |
| products | student_products | 1:N | RESTRICT |
| students | student_products | 1:N | RESTRICT |
| batches | admissions | 1:N | SET NULL |
| admissions | students | 1:1 | SET NULL |
| expenses | vendor_credits | 1:1 | SET NULL |

## Business Rule Enforcement (DB Level)

1. **Cannot delete batch with students** → `ON DELETE RESTRICT` on `students.batch_id`
2. **Cannot delete product already sold** → App checks `quantity_sold > 0` + `ON DELETE RESTRICT` on `student_products`
3. **Cannot delete vendor with pending credits** → App checks `pending_credit > 0`
4. **Historical prices immutable** → `student_products` stores frozen `unit_cost_price` / `unit_selling_price`
5. **Soft deletes** → All tables use `deleted_at` for logical deletion
