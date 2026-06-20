import "./globals.css";

export const metadata = {
title: "Inventory DSS Platform",
description: "Decision Support System for inventory optimization in retail MSEs."
};

export default function RootLayout({
children
}: {
children: React.ReactNode;
}) {
return ( <html lang="es"> <body>{children}</body> </html>
);
}
