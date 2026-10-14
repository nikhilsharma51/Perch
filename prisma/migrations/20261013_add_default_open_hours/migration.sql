-- Add default open hours for any spaces that don't have them
-- Default: 9am-6pm, all days open (except Sunday which might need special handling)
INSERT INTO "SpaceOpenHours" (id, "spaceId", "dayOfWeek", "startTime", "endTime", "isClosed", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  s.id,
  day.day_of_week,
  '09:00',
  '18:00',
  false,
  NOW(),
  NOW()
FROM "Space" s
CROSS JOIN (
  SELECT 0 as day_of_week UNION ALL
  SELECT 1 UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4 UNION ALL
  SELECT 5 UNION ALL
  SELECT 6
) day
WHERE NOT EXISTS (
  SELECT 1 FROM "SpaceOpenHours" soh
  WHERE soh."spaceId" = s.id
  AND soh."dayOfWeek" = day.day_of_week
)
ON CONFLICT ("spaceId", "dayOfWeek") DO NOTHING;
