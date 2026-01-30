import {Request, Response, Router} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {prisma} from "../../database";

export const authRouter = Router()

authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const {email, username, password} = req.body

    try {
        if (!email || !username || !password) {
            return res.status(400).json({ error: "Champs manquants" });
        }

        if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string") {
            return res.status(400).json({ error: "Données invalides" });
        }

        const existeDeja = await prisma.user.findUnique({ where: { email } });
        if (existeDeja) {
            return res.status(409).json({ error: "Email déjà utilisé" });
        }

        const hashed = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashed,
            },
            select: {
                id: true,
                email: true,
                username: true,
            },
        });

        // 3. Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'},
        )

        // 4. Retourner le token
        return res.status(201).json({
            message: 'Insciption réussie',
            token,
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

authRouter.post("/sign-in", async (req, res) => {
    const { email, password } = req.body

    try {
        
        if (!email || !password) {
        return res.status(400).json({ error: "Champs manquants" });
        }

        if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Données invalides" });
        }

        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                },
                process.env.JWT_SECRET as string,
                {expiresIn: '7d'},
        )

        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
            },
        });
    } catch (error) {
            console.error('Erreur lors de la connexion:', error)
            return res.status(500).json({error: 'Erreur serveur'})
    }
});