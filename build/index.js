"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = process.env.PORT || 3000;
const addNewContact = (value) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newContact = yield prisma.contact.create({
            data: {
                phoneNumber: value.phoneNumber || null,
                email: value.email || null,
                linkedId: value.linkedId || null,
                linkPrecedence: value.linkPrecedence || 'primary'
            }
        });
        console.log("adding new contact", value);
        console.log("new contact addition", addNewContact);
        // console.log(newContact);
        return newContact;
    }
    catch (e) {
        console.error(e);
        throw e;
    }
});
const rearrangeLinkedPrecedence = (value, contacts_list) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("first contact in list", contacts_list[0]);
        let id = contacts_list[0].id;
        if (contacts_list[0].linkPrecedence !== 'primary') {
            yield prisma.contact.update({
                where: { id: contacts_list[0].linkedId },
                data: { linkPrecedence: "primary" }
            });
            id = contacts_list[0].linkedId;
        }
        yield prisma.contact.updateMany({
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
        yield addNewContact({ phoneNumber: value.phoneNumber, email: value.email, linkedId: id, linkPrecedence: 'secondary' });
        return id;
    }
    catch (e) {
        console.error(e);
        throw e;
    }
});
app.post('/identify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phoneNumber } = req.body;
        if (!email && !phoneNumber)
            return res.status(400).json({ status: false, message: "Bad Request, Please provide email or phoneNumber" });
        const contacts_list = yield prisma.contact.findMany({
            where: {
                OR: [
                    { email: email },
                    { phoneNumber: phoneNumber }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        console.log("FOUND", contacts_list);
        let update_contacts_list;
        if (contacts_list.length > 0) {
            const id_after_rearrage = yield rearrangeLinkedPrecedence(req.body, contacts_list);
            if (id_after_rearrage && typeof (id_after_rearrage) == 'number' && !isNaN(id_after_rearrage)) {
                update_contacts_list = yield prisma.contact.findMany({
                    where: {
                        OR: [
                            { id: id_after_rearrage },
                            { linkedId: id_after_rearrage }
                        ]
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });
            }
        }
        else {
            yield addNewContact(req.body);
            update_contacts_list = yield prisma.contact.findMany({
                where: {
                    OR: [
                        { email: email },
                        { phoneNumber: phoneNumber }
                    ]
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
        }
        console.log("updated list", update_contacts_list);
        if (update_contacts_list) {
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
        }
        else {
            return res.status(500).json({ status: false, message: "Something Went Wrong" });
        }
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ status: false, message: "Something Went Wrong!!" });
    }
}));
app.delete('/delete/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const del = yield prisma.contact.deleteMany();
        return res.status(200).json({ status: true, message: "deleted all contacts" });
    }
    catch (e) {
        return res.status(500).json({ status: false, message: "Something Went Wrong!!" });
    }
}));
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prisma.contact.findMany();
    console.log(data);
    res.status(200).json({ status: true, message: "Hello Bitespeed!!", data: data });
}));
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
