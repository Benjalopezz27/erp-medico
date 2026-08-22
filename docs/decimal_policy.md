# Decimal and rounding policy

Financial values and unit conversions use PostgreSQL `numeric` columns and
`decimal.js` in the application. JavaScript floating-point arithmetic must not
be used for authoritative calculations.

## Stored values

| Value                          | Database type   | API rule                              |
| ------------------------------ | --------------- | ------------------------------------- |
| Minimum stock                  | `numeric(12,2)` | Non-negative, at most 2 decimals      |
| Net cost                       | `numeric(12,4)` | Non-negative, at most 4 decimals      |
| Markup percentage              | `numeric(8,4)`  | Nullable, between 0 and 1000          |
| Suggested and active net price | `numeric(12,2)` | Non-negative, at most 2 decimals      |
| Unit conversion factor         | `numeric(10,4)` | Greater than zero, at most 4 decimals |

## Calculations

- Suggested net price is `costNet * (1 + markupPercentage / 100)`.
- Presentation quantities are converted with
  `presentationQuantity * conversionFactor`.
- Intermediate operations use `Decimal`; rounding is applied only to the final
  result with `ROUND_HALF_UP`.
- Prices are rounded to 2 decimal places. Converted quantities are rounded to 4
  decimal places.
- Conversion inputs and outputs must be positive, finite, have at most 4 decimal
  places, and not exceed `99999999999999.9999`.
- JSON responses expose decimals as numbers for the current API contract. Values
  are converted to native numbers only after validation and rounding.
