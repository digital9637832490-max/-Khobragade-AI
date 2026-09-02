INSERT INTO coin_packages(name, coins, bonus_coins, price_inr, sort_order)
VALUES
('Starter',100,0,99,1),
('Creator',500,0,399,2),
('Pro',1000,0,699,3),
('Business',5000,0,2999,4)
ON CONFLICT DO NOTHING;

INSERT INTO settings(key, value)
VALUES
('tool.thumbnail','{"enabled":true,"coinCost":10,"dailyLimit":50,"maintenance":false}'::jsonb),
('tool.title','{"enabled":true,"coinCost":2,"dailyLimit":100,"maintenance":false}'::jsonb),
('tool.chat','{"enabled":true,"coinCost":2,"dailyLimit":200,"maintenance":false}'::jsonb),
('tool.description','{"enabled":true,"coinCost":3,"dailyLimit":100,"maintenance":false}'::jsonb),
('tool.tags','{"enabled":true,"coinCost":2,"dailyLimit":100,"maintenance":false}'::jsonb),
('tool.video','{"enabled":true,"coinCost":30,"dailyLimit":20,"maintenance":false}'::jsonb),
('tool.voiceover','{"enabled":true,"coinCost":10,"dailyLimit":50,"maintenance":false}'::jsonb)
ON CONFLICT(key) DO NOTHING;

INSERT INTO cms_items(scope,item_key,item_type,title,content,design,behavior,validation,sort_order)
VALUES
('website','home.hero','section','Home Hero',
 '{"heading":"Create better YouTube content with one Creator Studio.","subheading":"Generate thumbnails, titles, descriptions, tags and photo-to-video projects with a secure coin wallet.","primaryCta":{"label":"Get Started","href":"/register"},"secondaryCta":{"label":"View Pricing","href":"/pricing"}}',
 '{"visible":true,"layout":"hero"}','{"actions":[]}','{}',10),
('website','home.features','section','Home Features',
 '{"items":["AI Thumbnail Maker","AI Title Generator","AI Description Generator","AI Tags + Hashtags","Photo → Video","Coin Wallet"]}',
 '{"visible":true,"columns":"auto"}','{"actions":[]}','{}',20),
('website','navigation.main','navigation','Website Navigation',
 '{"items":[{"label":"Features","href":"/features"},{"label":"How It Works","href":"/how-it-works"},{"label":"Pricing","href":"/pricing"},{"label":"Contact","href":"/contact"},{"label":"Login","href":"/login"}]}',
 '{"visible":true}','{"openExternal":false}','{}',1),
('app','navigation.bottom','navigation','App Bottom Navigation',
 '{"items":[{"key":"home","label":"Home","icon":"home"},{"key":"create","label":"Create","icon":"auto_awesome"},{"key":"projects","label":"Projects","icon":"folder"},{"key":"coins","label":"Coins","icon":"monetization_on"},{"key":"profile","label":"Profile","icon":"person"}]}',
 '{"visible":true}','{}','{}',1),
('app','create.tools','collection','App Create Tools',
 '{"items":["AI Thumbnail","AI Title","AI Description","AI Tags","Photo → Video","Voice-over"]}',
 '{"visible":true,"columns":2}','{}','{}',10),
('admin','navigation.sidebar','navigation','Admin Sidebar',
 '{"items":["dashboard","users","payments","coin-management","ai-tools","projects","reports","notifications","support","audit-logs","admin-cms","website-cms","app-cms"]}',
 '{"visible":true}','{}','{}',1),
('admin','dashboard.cards','collection','Admin Dashboard Cards',
 '{"fields":["total_users","active_users","pending_payments","approved_payments","total_revenue","coins_sold","coins_used","ai_generations","video_jobs","failed_jobs"]}',
 '{"visible":true,"columns":"auto"}','{}','{}',10)
ON CONFLICT(scope,item_key) DO NOTHING;

INSERT INTO cms_items(scope,item_key,item_type,title,content,design,behavior,validation,sort_order)
VALUES
('website','page.features','page','Features Page','{"heading":"Features","body":"AI Thumbnail, AI Titles, Descriptions, Tags, Photo → Video, Voice-over and project management."}','{"visible":true}','{}','{}',100),
('website','page.how-it-works','page','How It Works Page','{"heading":"How It Works","body":"Register, recharge coins, select a creator tool, confirm cost, generate, preview and save your project."}','{"visible":true}','{}','{}',110),
('website','page.pricing','page','Pricing Page','{"heading":"Pricing","body":"Starter ₹99 / 100 coins · Creator ₹399 / 500 · Pro ₹699 / 1,000 · Business ₹2,999 / 5,000."}','{"visible":true}','{}','{}',120),
('website','page.contact','page','Contact Page','{"heading":"Contact","body":"Contact Creator Studio support using the support/contact channel configured by Admin."}','{"visible":true}','{}','{}',130),
('website','page.terms','page','Terms Page','{"heading":"Terms & Conditions","body":"Configure reviewed Terms & Conditions from Website CMS before public launch."}','{"visible":true}','{}','{}',140),
('website','page.privacy','page','Privacy Page','{"heading":"Privacy Policy","body":"Configure reviewed Privacy Policy from Website CMS before public launch."}','{"visible":true}','{}','{}',150),
('website','dashboard.navigation','navigation','User Dashboard Navigation','{"items":["dashboard","ai-thumbnail","ai-title","ai-description","ai-tags","photo-video","voice-over","projects","coins","transactions","notifications","support","profile"]}','{"visible":true}','{}','{}',2),
('app','home.cards','collection','App Home Cards','{"items":[{"title":"Welcome Creator","subtitle":"Coin Balance loads from /wallet"},{"title":"Quick Create","subtitle":"Thumbnail · Title · Video"},{"title":"Recent Projects","subtitle":"Loads from /projects"},{"title":"Notifications","subtitle":"Loads from /notifications"}]}','{"visible":true}','{}','{}',20)
ON CONFLICT(scope,item_key) DO NOTHING;
