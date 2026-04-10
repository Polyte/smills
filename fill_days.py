import pandas as pd
import random
from datetime import timedelta, date

# Set seed for reproducibility
random.seed(42)

# Read the Excel file
file_path = 'Orders.xlsx'
df = pd.read_excel(file_path, sheet_name='Sheet1')

# Identify the last row with the SUM formula (if any) - we'll keep it as is
# Assume all rows with non-null 'Name' (column C) are data rows
# The total row has no 'Name' value; we'll separate it
total_row_mask = df['Name'].isna()  # Rows without an SO number (Name)
data_df = df[~total_row_mask].copy()
total_row = df[total_row_mask].copy()

# Get unique customers
customers = data_df['Customer'].unique()

# Assign a random OrderDate to each customer
order_date_range = (date(2026, 1, 3), date(2026, 1, 31))
customer_order_dates = {}
for cust in customers:
    random_days = random.randint(0, (order_date_range[1] - order_date_range[0]).days)
    cust_date = order_date_range[0] + timedelta(days=random_days)
    customer_order_dates[cust] = cust_date

# Fill OrderDate and DeliveryDate for each row
order_dates = []
delivery_dates = []
for idx, row in data_df.iterrows():
    cust = row['Customer']
    order_date = customer_order_dates[cust]
    offset = random.randint(3, 7)
    delivery_date = order_date + timedelta(days=offset)
    order_dates.append(order_date)
    delivery_dates.append(delivery_date)

data_df['OrderDate'] = order_dates
data_df['DeliveryDate'] = delivery_dates

# Reorder columns to put DeliveryDate and OrderDate first (matching original layout)
cols = ['DeliveryDate', 'OrderDate'] + [c for c in data_df.columns if c not in ['DeliveryDate', 'OrderDate']]
data_df = data_df[cols]

# Combine back with the total row
final_df = pd.concat([data_df, total_row], ignore_index=True)

# Save to new Excel file
output_path = 'Orders_filled.xlsx'
final_df.to_excel(output_path, index=False, sheet_name='Sheet1')
print(f"Saved filled orders to {output_path}")