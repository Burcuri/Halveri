const products = [
    {
        urun: "Domates",
        il: "Antalya",
        min: 22,
        max: 28
    },
    {
        urun: "Domates",
        il: "İstanbul",
        min: 30,
        max: 35
    },
    {
        urun: "Salatalık",
        il: "Antalya",
        min: 18,
        max: 23
    },
    {
        urun: "Patlıcan",
        il: "Bursa",
        min: 20,
        max: 30
    }
];

const list = document.getElementById("list");
const search = document.getElementById("search");

function render(data){

    list.innerHTML = "";

    data.forEach(item=>{

        list.innerHTML += `
        <div class="card">

            <h3>${item.urun}</h3>

            <div>${item.il}</div>

            <div class="price">
                <span>Min: ${item.min} ₺</span>
                <span>Max: ${item.max} ₺</span>
            </div>

        </div>
        `;

    });

}

render(products);

search.addEventListener("input",()=>{

    const q = search.value.toLowerCase();

    const filtered = products.filter(x=>

        x.urun.toLowerCase().includes(q) ||
        x.il.toLowerCase().includes(q)

    );

    render(filtered);

});

document.getElementById("updateBtn").addEventListener("click",()=>{

    alert("Şimdilik örnek veri gösteriliyor.\n\nBir sonraki adımda Supabase'den gerçek veriler gelecek.");

});
