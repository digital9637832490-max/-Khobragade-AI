INSERT INTO settings(key, value)
VALUES
('tool.thumbnail','{"enabled":true,"dailyLimit":100,"maintenance":false}'::jsonb),
('tool.photo','{"enabled":true,"dailyLimit":100,"maintenance":false}'::jsonb),
('tool.title','{"enabled":true,"dailyLimit":200,"maintenance":false}'::jsonb),
('tool.chat','{"enabled":true,"dailyLimit":300,"maintenance":false}'::jsonb),
('tool.description','{"enabled":true,"dailyLimit":200,"maintenance":false}'::jsonb),
('tool.tags','{"enabled":true,"dailyLimit":200,"maintenance":false}'::jsonb),
('tool.video','{"enabled":true,"dailyLimit":50,"maintenance":false}'::jsonb),
('tool.voiceover','{"enabled":true,"dailyLimit":100,"maintenance":false}'::jsonb)
ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;

INSERT INTO cms_items(scope,item_key,item_type,title,content,design,behavior,validation,sort_order)
VALUES
('website','home.hero','section','Home Hero',
 '{"heading":"Create better YouTube content with one Creator Studio.","subheading":"Generate thumbnails, titles, descriptions, tags, images and videos in one AI workspace.","primaryCta":{"label":"Get Started","href":"/register"},"secondaryCta":{"label":"View Pricing","href":"/pricing"}}',
 '{"visible":true,"layout":"hero"}','{"actions":[]}','{}',10),
('website','home.features','section','Home Features',
 '{"items":["AI Thumbnail Maker","AI Title Generator","AI Description Generator","AI Tags + Hashtags","Photo → Video","Coin Wallet"]}',
 '{"visible":true,"columns":"auto"}','{"actions":[]}','{}',20),
('website','navigation.main','navigation','Website Navigation',
 '{"items":[{"label":"Features","href":"/features"},{"label":"How It Works","href":"/how-it-works"},{"label":"Pricing","href":"/pricing"},{"label":"Contact","href":"/contact"},{"label":"Login","href":"/login"}]}',
 '{"visible":true}','{"openExternal":false}','{}',1),
('app','navigation.bottom','navigation','App Bottom Navigation',
 '{"items":[{"key":"chat","label":"Khobragade AI","icon":"auto_awesome"},{"key":"projects","label":"Projects","icon":"folder"},{"key":"profile","label":"Profile","icon":"person"}]}',
 '{"visible":true}','{}','{}',1),
('app','create.tools','collection','App Create Tools',
 '{"items":["AI Thumbnail","AI Title","AI Description","AI Tags","Photo → Video","Voice-over"]}',
 '{"visible":true,"columns":2}','{}','{}',10),
('admin','navigation.sidebar','navigation','Admin Sidebar',
 '{"items":["dashboard","users","ai-tools","support","audit-logs","admin-cms","website-cms","app-cms"]}',
 '{"visible":true}','{}','{}',1),
('admin','dashboard.cards','collection','Admin Dashboard Cards',
 '{"fields":["total_users","active_users","ai_generations","video_jobs","failed_jobs"]}',
 '{"visible":true,"columns":"auto"}','{}','{}',10)
ON CONFLICT(scope,item_key) DO NOTHING;

INSERT INTO cms_items(scope,item_key,item_type,title,content,design,behavior,validation,sort_order)
VALUES
('website','page.features','page','Features Page','{"heading":"Features","body":"AI Thumbnail, AI Titles, Descriptions, Tags, Photo → Video, Voice-over and project management."}','{"visible":true}','{}','{}',100),
('website','page.how-it-works','page','How It Works Page','{"heading":"How It Works","body":"Register, choose an AI tool, generate, preview and save your project."}','{"visible":true}','{}','{}',110),
('website','page.pricing','page','Pricing Page','{"heading":"Pricing","body":"All listed AI features are available without a coin wallet."}','{"visible":true}','{}','{}',120),
('website','page.contact','page','Contact Page','{"heading":"Contact","body":"Contact Creator Studio support using the support/contact channel configured by Admin."}','{"visible":true}','{}','{}',130),
('website','page.terms','page','Terms Page','{"heading":"Terms & Conditions","body":"Configure reviewed Terms & Conditions from Website CMS before public launch."}','{"visible":true}','{}','{}',140),
('website','page.privacy','page','Privacy Page','{"heading":"Privacy Policy","body":"Configure reviewed Privacy Policy from Website CMS before public launch."}','{"visible":true}','{}','{}',150),
('website','dashboard.navigation','navigation','User Dashboard Navigation','{"items":["dashboard","chat","ai-thumbnail","ai-title","ai-description","ai-tags","photo-video","voice-over","support","profile"]}','{"visible":true}','{}','{}',2),
('app','home.cards','collection','App Home Cards','{"items":[{"title":"Welcome Creator","subtitle":"Your AI workspace is ready"},{"title":"Quick Create","subtitle":"Thumbnail · Title · Video"},{"title":"Recent Projects","subtitle":"Loads from /projects"},{"title":"Notifications","subtitle":"Loads from /notifications"}]}','{"visible":true}','{}','{}',20)
ON CONFLICT(scope,item_key) DO NOTHING;
