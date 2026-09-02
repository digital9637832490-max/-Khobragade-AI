import {cms} from '../lib/cms';
export default async function CmsPublicPage({cmsKey,fallbackTitle,fallbackBody}:{cmsKey:string;fallbackTitle:string;fallbackBody:string}){const item=await cms('website',cmsKey);const c=item?.content||{};return <main className="main"><h1>{c.heading||fallbackTitle}</h1><div className="card"><p>{c.body||fallbackBody}</p><a href="/">← Home</a></div></main>}
