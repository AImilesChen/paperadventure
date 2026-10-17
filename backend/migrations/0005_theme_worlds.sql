-- Seed the six public story worlds so ready-pack versions can reference them.
-- A published world is editorially visible; it does not publish a downloadable pack.
INSERT OR IGNORE INTO theme_worlds (id,title_en,status) VALUES
  ('celebration','Celebration','published'),
  ('dinosaur','Dinosaur','published'),
  ('space','Space','published'),
  ('forest','Forest','published'),
  ('halloween','Halloween','published'),
  ('christmas','Christmas','published');
