const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['https://www.roblox.com', 'https://web.roblox.com', 'https://create.roblox.com'],
    methods: ['GET'],
    credentials: true
}));

const rateLimit = {};
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

function checkRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimit[ip]) {
        rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    } else if (now > rateLimit[ip].resetTime) {
        rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    } else if (rateLimit[ip].count >= RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    } else {
        rateLimit[ip].count++;
    }
    
    next();
}

app.use(checkRateLimit);

app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        service: 'Roblox Proxy',
        endpoints: ['/followers/:userId', '/group/:userId']
    });
});

app.get('/followers/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }
        
        const response = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Roblox API error' });
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Followers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/group/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }
        
        const response = await fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Roblox API error' });
        }
        
        const data = await response.json();
        
        // Find PRIMARY group (isPrimaryGroup: true)
        let primaryGroup = null;
        
        if (data && data.data && Array.isArray(data.data)) {
            for (const groupRole of data.data) {
                if (groupRole.isPrimaryGroup === true) {
                    primaryGroup = groupRole;
                    break;
                }
            }
        }
        
        if (primaryGroup) {
            res.json({
                groupId: primaryGroup.group?.id,
                groupName: primaryGroup.group?.name,
                role: primaryGroup.role?.name,
                isPrimary: true
            });
        } else {
            res.json({ 
                groupId: null, 
                groupName: null, 
                role: null,
                isPrimary: false
            });
        }
        
    } catch (error) {
        console.error('Group error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
