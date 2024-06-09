import express from 'express';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const app = express();
app.use(express.json());
const port = 3000;

const addNewContact = async (value: any) => {
    try {
        const newContact = await prisma.contact.create({
            data: {
                phoneNumber: value.phoneNumber || null,
                email: value.email || null,
                linkedId: value.linkedId || null,
                linkPrecedence: value.linkPrecedence || 'primary'
            }
        })

        // console.log(newContact);
        return newContact;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

const rearrangeLinkedPrecedence = async (value: { phoneNumber: string, email: string }, contacts_list: any) => {
    try {

        let id = contacts_list[0].id;

        if (contacts_list[0].linkPrecedence !== 'primary') {
            await prisma.contact.update({
                where: { id: contacts_list[0].linkedId },
                data: { linkPrecedence: "primary" }
            });
            contacts_list[0].linkedId
        }
        await prisma.contact.updateMany({
            where: {
                OR: [
                    { email: contacts_list[0].email },
                    { phoneNumber: contacts_list[0].phoneNumber }
                ],
                NOT: {
                    id: id
                },
                AND: [
                    { linkPrecedence: 'primary' },
                    { linkedId: { not: id } }
                ]
            },
            data: {
                linkPrecedence: "secondary",
                linkedId: id
            }
        });

        await addNewContact({ phoneNumber: value.phoneNumber, email: value.email, linkedId: id, linkPrecedence: 'secondary' });

        return true;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

app.post('/identify', async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;
        if (!email && !phoneNumber) return res.status(400).json({ status: false, message: "Bad Request, Please provide email or phoneNumber" });

        const contacts_list = await prisma.contact.findMany({
            where: {
                OR: [
                    { email: email as string },
                    { phoneNumber: phoneNumber as string }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log("FOUND", contacts_list);

        if (contacts_list.length > 0) {
            await rearrangeLinkedPrecedence(req.body, contacts_list);
        } else {
            await addNewContact(req.body);
        }

        const update_contacts_list = await prisma.contact.findMany({
            where: {
                OR: [
                    { email: email as string },
                    { phoneNumber: phoneNumber as string }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log("updated list", update_contacts_list);

        const primaryContactId = update_contacts_list[0].id;
        const emails = [...new Set(update_contacts_list.map(contact => contact.email).filter(Boolean))];
        const phoneNumbers = [...new Set(update_contacts_list.map(contact => contact.phoneNumber).filter(Boolean))];
        const secondaryContactIds = update_contacts_list
            .filter(contact => contact.linkPrecedence === 'secondary')
            .map(contact => contact.id);

        const response = {
            contact: {
                primaryContactId,
                emails,
                phoneNumbers,
                secondaryContactIds
            }
        };

        return res.status(200).json(response);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ status: false, message: "Something Went Wrong!!" });
    }
})

app.delete('/delete/all', async (req, res) => {
    try {
        const del = await prisma.contact.deleteMany();
        return res.status(200).json({ status: true, message: "deleted all contacts" });
    } catch (e) {
        return res.status(500).json({ status: false, message: "Something Went Wrong!!" });
    }
})

app.get('/', async (req, res) => {
    const data = await prisma.contact.findMany();
    console.log(data);
    res.status(200).json({ status: true, message: "Hello World", data: data });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});