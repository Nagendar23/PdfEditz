//open an existing PDF
//write the text 
//save the new PDF


import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from 'fs';

export const addTextToPDF = async({
    inputPath,
    outputPath,
    elements
})=>{
    const existingPDFBytes = fs.readFileSync(inputPath);///reads file into memory
    const pdfDoc = await PDFDocument.load(existingPDFBytes); //load into pdf-lib, so lib can now modify 
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);   
    const pages =pdfDoc.getPages();
    // const firstPage =pages[0]
    // const {height} = firstPage.getSize();

    //fix teh coordinte system
    // const correctedY=height-y;
    for(const el of elements){
        const pageIndex = el.page ?? 0;
        if(pageIndex <0 || pageIndex>=pages.length){
            throw new Error(`Invalid page index : ${pageIndex}`)
        }

        const page = pages[pageIndex];
        const {width, height} = page.getSize();

        let {x,y} = el.position;
        //convert frontend => PDF cordinate system
        y=height-y;
        const fontSize = el.style?.fontSize || 20;
        
        //accurate text width using font
        const textWidth = font.widthOfTextAtSize(el.text, fontSize);
        //alignment handling
        const align = el.style?.align || "left";
        if(align==="center"){
            x=x-textWidth/2
        }else if(align==="right"){
            x=x-textWidth
        }
        //color parsing
        let color = rgb(0,0,0) //default is black
        if(el.style?.color){
            const hex = el.style.color.replace("#","");
            const r = parseInt(hex.substring(0,2),16)/255;
            const g = parseInt(hex.substring(2,4),16)/255;
            const b = parseInt(hex.substring(4,6),16)/255;
            color=rgb(r,g,b)

        }
        page.drawText(el.text,{
            x,
            y,
            size:fontSize,
            font,
            color
        })
    }

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(outputPath, pdfBytes)  //writes modified PDF to disk
}

