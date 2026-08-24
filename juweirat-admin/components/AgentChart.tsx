'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/**
 * Rendu d'un graphe demandé par l'agent via un fenced code block ```chart.
 * Contrat JSON minimal :
 *   {
 *     "type": "bar" | "line" | "pie",
 *     "title": "Occupation par catégorie",
 *     "xKey": "category",                       // requis pour bar/line
 *     "yKeys": ["percent"] | "percent",         // 1..n séries (bar/line)
 *     "nameKey": "category" | "labelKey": ...   // pour pie (label des tranches)
 *     "valueKey": "percent",                    // pour pie (valeur des tranches)
 *     "data": [ {...}, ... ],
 *     "unit": "%" | "F" (optionnel, sert au tooltip)
 *   }
 */

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface ChartSpec {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  xKey?: string;
  yKeys?: string | string[];
  nameKey?: string;
  valueKey?: string;
  data: Array<Record<string, unknown>>;
  unit?: string;
}

function formatValue(v: unknown, unit?: string): string {
  if (typeof v !== 'number') return String(v);
  const rounded = Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('fr-FR').replace(/,/g, ' ') : v.toString();
  return unit ? `${rounded} ${unit}` : rounded;
}

export default function AgentChart({ raw }: { raw: string }) {
  let spec: ChartSpec;
  try {
    spec = JSON.parse(raw);
  } catch (err) {
    return (
      <div className="my-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
        Graphe illisible ({err instanceof Error ? err.message : 'JSON invalide'}).
      </div>
    );
  }

  if (!spec.data || !Array.isArray(spec.data) || spec.data.length === 0) {
    return null;
  }

  const yKeys: string[] = Array.isArray(spec.yKeys) ? spec.yKeys : spec.yKeys ? [spec.yKeys] : [];

  return (
    <div className="my-3 p-3 bg-white border border-gray-200 rounded-xl">
      {spec.title && <div className="text-xs font-medium text-gray-600 mb-2">{spec.title}</div>}
      <div className="h-56 w-full">
        <ResponsiveContainer>
          {spec.type === 'bar' && spec.xKey ? (
            <BarChart data={spec.data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey={spec.xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatValue(v)} />
              <Tooltip formatter={(v) => formatValue(v, spec.unit)} />
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {yKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : spec.type === 'line' && spec.xKey ? (
            <LineChart data={spec.data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey={spec.xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatValue(v)} />
              <Tooltip formatter={(v) => formatValue(v, spec.unit)} />
              {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {yKeys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : spec.type === 'pie' && spec.valueKey ? (
            <PieChart>
              <Tooltip formatter={(v) => formatValue(v, spec.unit)} />
              <Pie
                data={spec.data}
                dataKey={spec.valueKey}
                nameKey={spec.nameKey ?? spec.xKey ?? 'name'}
                cx="50%"
                cy="50%"
                outerRadius={72}
                label={{ fontSize: 11 }}
              >
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : (
            <div className="text-xs text-gray-400 flex items-center justify-center h-full">
              Graphe : type ou clés manquants.
            </div>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
