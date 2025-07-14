import { Request, Response } from "express";
import { LogInfo } from "@utils/logger";
import User from "@models/User";

const getUser = (req: Request, res: Response) => {
	LogInfo(`Getting user '${req.params.id}'`);
	User.findOne({ userId: req.params.id })
		.then((user) => res.status(200).json(user))
		.catch((error) => res.status(404).json({ error }));
};

const createUser = (req: Request, res: Response) => {
	LogInfo(`Creating user '${req.body.username}'`);
	const user = new User({ ...req.body });
	user
		.save()
		.then(() => res.status(201).json({ message: "User created!" }))
		.catch((error) => res.status(400).json({ error }));
};

const updateUser = (req: Request, res: Response) => {
	LogInfo(`Updating user '${req.params.id}'`);
	User.findOne({ userId: req.params.id })
		.then((user) => {
			console.log(user);
			const userObj = { ...req.body };
			User.updateOne({ userId: req.params.id }, { ...userObj })
				.then(() => res.status(200).json({ message: "User updated!" }))
				.catch((error) => res.status(400).json({ error }));
		})
		.catch(() => res.status(404).json({ error: "User not found" }));
};

export default { getUser, createUser, updateUser };
