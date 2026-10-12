import pandas as pd
import matplotlib.pyplot as plt

# 1. Read the CSV file
df = pd.read_csv('audit_report.csv')

# 2. Categorize the connections (IPv4, IPv6, or Error)
def categorize(row):
    if row['Status'] == 'SUCCESS':
        return row['Transport']
    return 'Error'

df['Category'] = df.apply(categorize, axis=1)

# 3. Count the categories for each website
chart_data = df.groupby(['Source Site', 'Category']).size().unstack(fill_value=0)

# 4. Draw the stacked bar chart
colors = {'IPv4': '#3498db', 'IPv6': '#2ecc71', 'Error': '#e74c3c'}
# Only use colors for the categories that actually exist in the data
plot_colors = [colors.get(c, '#95a5a6') for c in chart_data.columns]

ax = chart_data.plot(kind='bar', stacked=True, figsize=(10, 6), color=plot_colors)

plt.title('IPv6 Dependency Readiness by Website', fontsize=16, pad=15)
plt.xlabel('Audited Website', fontsize=12)
plt.ylabel('Number of Network Dependencies', fontsize=12)
plt.xticks(rotation=45, ha='right')
plt.legend(title='Connection Type')
plt.tight_layout()

# 5. Save the image
plt.savefig('dependency_graph.png', dpi=300)
print("\nSuccess! Visualization saved as dependency_graph.png")
