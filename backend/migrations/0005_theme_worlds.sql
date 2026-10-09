-- Seed the six public story worlds so ready-pack versions can reference them.
-- A published world is editorially visible; it does not publish a downloadable pack.
INSERT OR IGNORE INTO theme_worlds (id,title_en,status) VALUES
  ('celebration','Celebration','published'),
  ('dinosaur','Dinosaur Discovery','published'),
  ('space','Space Adventure','published'),
  ('forest','Forest Adventure','published'),
  ('halloween','Autumn Mystery','published'),
  ('christmas','Winter Workshop','published');
