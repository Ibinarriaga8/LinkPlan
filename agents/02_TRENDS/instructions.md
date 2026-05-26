# TRENDS AGENT - Análisis de gustos

## Objetivo
Convertir las preferencias de usuarios (foodTags/activityTags) y los tags de
venues en señales accionables: tags populares, venues con mayor match, y
recomendaciones por usuario.

## Entradas
- `preferences` de DATABASE.getAllPreferences()
- `venueTagFreq` de DATABASE.getVenueTagFrequencies()
- `venues` de DATABASE.getAllVenues()

## Salidas
```
{
  topFoodTags:     [{ tag, score, userCount }],
  topActivityTags: [{ tag, score, userCount }],
  recommendations: { [userId]: [{ venueId, score, matchedTags }] }
}
```

## Algoritmo de scoring
- Frecuencia por tag y categoría
- `score = (userCount / totalUsers) * (1 + matchedVenuesRatio)`
- Recomendación por usuario: venues cuyo `tags` intersecta con preferencias del
  usuario, ordenadas por nº de matches y luego por `price` ascendente

## Modo sin datos
Si DATABASE devuelve listas vacías o está en `skipped`, TRENDS opera sobre el
input que reciba (puede ser un sample fijture). En producción debería abortar
si no hay datos, pero en este sistema retorna `status: 'skipped'`.

## Supervisión aislada
```
node agents/02_TRENDS/test.js
```
Usa un dataset sintético para validar el algoritmo sin BD.
