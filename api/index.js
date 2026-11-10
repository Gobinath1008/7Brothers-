import { handleLogin, handleMe, handleInit } from '../server/handlers/auth.js';
import { handleTournaments, handleTournamentDetail } from '../server/handlers/tournaments.js';
import { handleRegistrations, handleRegistrationDetail } from '../server/handlers/registrations.js';
import { handleTeamsConfirm } from '../server/handlers/teams.js';
import { handleMatches, handleMatchDetail, handleMatchesGenerate } from '../server/handlers/matches.js';
import { handleScoreBall, handleScoreStatus, handleScoreUndo } from '../server/handlers/scoring.js';
import { handleExportsData } from '../server/handlers/exports.js';

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString('utf-8');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  // CORS & Preflight
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Response helpers polyfill
  if (!res.status) {
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  try {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `http://${host}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, ''); // Strip trailing slash

    // Merge searchParams into req.query
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
    req.query = { ...queryParams, ...(req.query || {}) };

    // Parse body if not present
    if (!req.body || typeof req.body !== 'object') {
      req.body = await parseBody(req);
    }

    // Split path into segments after '/api'
    const match = pathname.match(/^\/api(?:\/(.*))?$/);
    const subPath = match && match[1] ? match[1] : '';
    const parts = subPath.split('/').filter(Boolean);

    // 1. Auth routes: /api/auth/*
    if (parts[0] === 'auth') {
      if (parts[1] === 'login') return await handleLogin(req, res);
      if (parts[1] === 'me') return await handleMe(req, res);
      if (parts[1] === 'init') return await handleInit(req, res);
    }

    // 2. Tournaments: /api/tournaments or /api/tournaments/:id
    if (parts[0] === 'tournaments') {
      if (parts.length === 1) {
        return await handleTournaments(req, res);
      }
      const id = parts[1];
      req.query.id = id;
      return await handleTournamentDetail(req, res, id);
    }

    // 3. Registrations: /api/registrations or /api/registrations/:id
    if (parts[0] === 'registrations') {
      if (parts.length === 1) {
        return await handleRegistrations(req, res);
      }
      const id = parts[1];
      req.query.id = id;
      return await handleRegistrationDetail(req, res, id);
    }

    // 4. Teams: /api/teams/confirm
    if (parts[0] === 'teams') {
      if (parts[1] === 'confirm') {
        return await handleTeamsConfirm(req, res);
      }
    }

    // 5. Matches: /api/matches, /api/matches/generate, /api/matches/:id
    if (parts[0] === 'matches') {
      if (parts.length === 1) {
        return await handleMatches(req, res);
      }
      if (parts[1] === 'generate') {
        return await handleMatchesGenerate(req, res);
      }
      const id = parts[1];
      req.query.id = id;
      return await handleMatchDetail(req, res, id);
    }

    // 6. Scoring: /api/scoring/ball, /api/scoring/status, /api/scoring/undo
    if (parts[0] === 'scoring') {
      if (parts[1] === 'ball') return await handleScoreBall(req, res);
      if (parts[1] === 'status') return await handleScoreStatus(req, res);
      if (parts[1] === 'undo') return await handleScoreUndo(req, res);
    }

    // 7. Exports: /api/exports/data
    if (parts[0] === 'exports') {
      if (parts[1] === 'data') return await handleExportsData(req, res);
    }

    // Root /api health check
    if (parts.length === 0) {
      return res.status(200).json({
        success: true,
        message: '7Brothers Box Cricket API is live 🏏🔥',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(404).json({
      success: false,
      message: `API route not found: ${pathname}`,
    });
  } catch (error) {
    console.error('API Error in catch-all router:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
}
