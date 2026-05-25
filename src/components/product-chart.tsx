"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ProductChart({ data }: { data: { month: string; qty_sold: number; revenue: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
          <YAxis yAxisId="qty" tickLine={false} axisLine={false} width={36} className="text-xs" allowDecimals={false} />
          <YAxis
            yAxisId="rev"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={72}
            className="text-xs"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius)",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
            }}
            formatter={(value, name) =>
              name === "Revenue" ? [`TZS ${Number(value).toLocaleString()}`, name] : [value, name]
            }
          />
          <Legend />
          <Bar yAxisId="qty" dataKey="qty_sold" name="Units sold" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
