import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config.js';

export function signToken(id:string, role:'user'|'admin'){
  return jwt.sign({sub:id, role}, config.authSecret, {expiresIn: config.authTtl as any});
}
export function requireAuth(req:Request,res:Response,next:NextFunction){
  const raw = req.headers.authorization;
  if(!raw?.startsWith('Bearer ')) return res.status(401).json({error:'Unauthorized'});
  try{
    const decoded = jwt.verify(raw.slice(7), config.authSecret) as any;
    req.auth = {id:String(decoded.sub), role:decoded.role};
    next();
  }catch{ return res.status(401).json({error:'Invalid or expired token'}); }
}
export function requireAdmin(req:Request,res:Response,next:NextFunction){
  if(req.auth?.role !== 'admin') return res.status(403).json({error:'Admin required'});
  next();
}
