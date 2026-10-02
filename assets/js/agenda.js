/* =========================================================
   AGENDA COMPRAS
   AGENDA COMPRADOR
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           ELEMENTOS
        ================================================= */

        const viewButtons =
            document.querySelectorAll(
                ".agenda-view-button"
            );

        const periodTitle =
            document.getElementById(
                "periodTitle"
            );

        const previousPeriod =
            document.getElementById(
                "previousPeriod"
            );

        const nextPeriod =
            document.getElementById(
                "nextPeriod"
            );

        const todayButton =
            document.getElementById(
                "todayButton"
            );

        const groupFilter =
            document.getElementById(
                "agendaGroupFilter"
            );

        const newAppointmentButton =
            document.getElementById(
                "newAppointmentButton"
            );

        const monthView =
            document.getElementById(
                "monthView"
            );

        const weekView =
            document.getElementById(
                "weekView"
            );

        const dayView =
            document.getElementById(
                "dayView"
            );

        const monthCalendar =
            document.getElementById(
                "monthCalendar"
            );

        const weekCalendar =
            document.getElementById(
                "weekCalendar"
            );

        const dayCalendar =
            document.getElementById(
                "dayCalendar"
            );



        /* =================================================
           DATA ATUAL
        ================================================= */

        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );



        /* =================================================
           HORIZONTE DA AGENDA
           MÊS ATUAL + PRÓXIMO MÊS
        ================================================= */

        const horizonStart =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );


        const horizonEnd =
            new Date(
                today.getFullYear(),
                today.getMonth() + 2,
                0
            );


        horizonEnd.setHours(
            0,
            0,
            0,
            0
        );



        /* =================================================
           ESTADO
        ================================================= */

        let currentView =
            "month";


        let currentDate =
            new Date(today);



        /* =================================================
           NOMES
        ================================================= */

        const monthNames = [

            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"

        ];


        const weekdayNames = [

            "Domingo",
            "Segunda-feira",
            "Terça-feira",
            "Quarta-feira",
            "Quinta-feira",
            "Sexta-feira",
            "Sábado"

        ];


        const weekdayShort = [

            "Dom",
            "Seg",
            "Ter",
            "Qua",
            "Qui",
            "Sex",
            "Sáb"

        ];



        /* =================================================
           DADOS DE DEMONSTRAÇÃO
           SERÃO SUBSTITUÍDOS PELO SUPABASE
        ================================================= */

        const appointments = [

            {
                date: "2026-10-05",
                time: "08:00",
                manufacturer: "CIMED",
                group: "ZTT",
                classification: "Perfumaria",
                status: "normal",
                statusLabel: "Normal"
            },

            {
                date: "2026-10-06",
                time: "10:00",
                manufacturer: "ACHE",
                group: "ZTT",
                classification: "Propagado",
                status: "attention",
                statusLabel: "Atenção"
            },

            {
                date: "2026-10-08",
                time: "14:00",
                manufacturer: "UNILEVER",
                group: "Cella",
                classification: "Dermocosméticos",
                status: "urgent",
                statusLabel: "Urgente"
            },

            {
                date: "2026-10-15",
                time: "09:00",
                manufacturer: "EMS",
                group: "ZTT",
                classification: "Genéricos",
                status: "normal",
                statusLabel: "Normal"
            },

            {
                date: "2026-11-05",
                time: "10:00",
                manufacturer: "CIMED",
                group: "ZTT",
                classification: "Genéricos",
                status: "attention",
                statusLabel: "Atenção"
            }

        ];



        /* =================================================
           FORMATAR DATA ISO
        ================================================= */

        function dateToISO(
            date
        ) {

            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                );


            return `${year}-${month}-${day}`;

        }



        /* =================================================
           DATA DE UMA STRING
        ================================================= */

        function parseISODate(
            value
        ) {

            const [
                year,
                month,
                day
            ] =
                value
                    .split("-")
                    .map(Number);


            return new Date(
                year,
                month - 1,
                day
            );

        }



        /* =================================================
           COMPARAR DATAS
        ================================================= */

        function isSameDate(
            dateA,
            dateB
        ) {

            return (
                dateA.getFullYear() ===
                dateB.getFullYear()

                &&

                dateA.getMonth() ===
                dateB.getMonth()

                &&

                dateA.getDate() ===
                dateB.getDate()
            );

        }



        /* =================================================
           DATA DENTRO DO HORIZONTE
        ================================================= */

        function isInsideHorizon(
            date
        ) {

            return (
                date >= horizonStart &&
                date <= horizonEnd
            );

        }



        /* =================================================
           SEGUNDA-FEIRA DA SEMANA
        ================================================= */

        function getMonday(
            date
        ) {

            const result =
                new Date(date);


            const day =
                result.getDay();


            const difference =
                day === 0
                    ? -6
                    : 1 - day;


            result.setDate(
                result.getDate() +
                difference
            );


            result.setHours(
                0,
                0,
                0,
                0
            );


            return result;

        }



        /* =================================================
           SEXTA-FEIRA DA SEMANA
        ================================================= */

        function getFriday(
            date
        ) {

            const monday =
                getMonday(date);


            const friday =
                new Date(
                    monday
                );


            friday.setDate(
                friday.getDate() + 4
            );


            return friday;

        }



        /* =================================================
           PEGAR AGENDAMENTOS
        ================================================= */

        function getAppointmentsForDate(
            date
        ) {

            const iso =
                dateToISO(
                    date
                );


            let result =
                appointments.filter(
                    appointment =>
                        appointment.date ===
                        iso
                );


            if (
                groupFilter &&
                groupFilter.value !== "all"
            ) {

                result =
                    result.filter(
                        appointment =>
                            appointment.group ===
                            groupFilter.value
                    );

            }


            return result;

        }



        /* =================================================
           TÍTULO
        ================================================= */

        function updatePeriodTitle() {

            if (!periodTitle) {
                return;
            }



            /* ---------------------------------------------
               MÊS
            ---------------------------------------------- */

            if (
                currentView ===
                "month"
            ) {

                periodTitle.textContent =
                    `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

                return;

            }



            /* ---------------------------------------------
               SEMANA
            ---------------------------------------------- */

            if (
                currentView ===
                "week"
            ) {

                const monday =
                    getMonday(
                        currentDate
                    );


                const friday =
                    getFriday(
                        currentDate
                    );


                periodTitle.textContent =
                    `${formatDateShort(monday)} a ${formatDateShort(friday)}`;

                return;

            }



            /* ---------------------------------------------
               DIA
            ---------------------------------------------- */

            if (
                currentView ===
                "day"
            ) {

                periodTitle.textContent =
                    `${String(
                        currentDate.getDate()
                    ).padStart(
                        2,
                        "0"
                    )} de ${monthNames[
                        currentDate.getMonth()
                    ]} de ${currentDate.getFullYear()}`;

            }

        }



        /* =================================================
           DATA CURTA
        ================================================= */

        function formatDateShort(
            date
        ) {

            return (
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                )
                +
                "/"
                +
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                )
            );

        }



        /* =================================================
           RENDERIZAR MÊS
        ================================================= */

        function renderMonth() {

            if (!monthCalendar) {
                return;
            }


            const year =
                currentDate.getFullYear();


            const month =
                currentDate.getMonth();


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            let startPosition =
                firstDay.getDay();


            /*
                Domingo = 0
                Segunda = 1
            */

            startPosition =
                startPosition === 0
                    ? 6
                    : startPosition - 1;


            let html = "";


            /* ---------------------------------------------
               TÍTULO
            ---------------------------------------------- */

            html += `

                <div class="month-calendar-title">

                    <strong>
                        ${monthNames[month]}
                    </strong>

                    <span>
                        ${year}
                    </span>

                </div>

            `;


            /* ---------------------------------------------
               SEMANA
            ---------------------------------------------- */

            html += `

                <div class="calendar-header">

                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div class="weekend-column">Sáb</div>
                    <div class="weekend-column">Dom</div>

                </div>

            `;


            /* ---------------------------------------------
               GRADE
            ---------------------------------------------- */

            html += `
                <div class="calendar-grid">
            `;


            /* ---------------------------------------------
               DIAS ANTERIORES
            ---------------------------------------------- */

            for (
                let i = 0;
                i < startPosition;
                i++
            ) {

                html += `

                    <div class="calendar-day previous-month">

                        <span class="calendar-day-number">
                        </span>

                    </div>

                `;

            }



            /* ---------------------------------------------
               DIAS DO MÊS
            ---------------------------------------------- */

            for (
                let day = 1;
                day <= lastDay.getDate();
                day++
            ) {

                const date =
                    new Date(
                        year,
                        month,
                        day
                    );


                const weekday =
                    date.getDay();


                const weekend =
                    weekday === 0 ||
                    weekday === 6;


                const todayClass =
                    isSameDate(
                        date,
                        today
                    )
                        ? "current-day"
                        : "";


                const dayAppointments =
                    getAppointmentsForDate(
                        date
                    );


                html += `

                    <div
                        class="calendar-day ${weekend ? "weekend" : ""} ${todayClass}"
                    >

                        <span class="calendar-day-number">
                            ${day}
                        </span>


                        <div class="calendar-appointments">

                            ${
                                dayAppointments
                                    .map(
                                        appointment => `

                                            <div
                                                class="calendar-appointment ${appointment.status}"
                                                data-date="${appointment.date}"
                                            >
                                                ${appointment.time} · ${appointment.manufacturer}
                                            </div>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>

                `;

            }



            /* ---------------------------------------------
               DIAS RESTANTES
            ---------------------------------------------- */

            const totalCells =
                startPosition +
                lastDay.getDate();


            const remaining =
                totalCells % 7 === 0
                    ? 0
                    : 7 - (
                        totalCells % 7
                    );


            for (
                let i = 0;
                i < remaining;
                i++
            ) {

                html += `

                    <div class="calendar-day next-month">

                        <span class="calendar-day-number">
                        </span>

                    </div>

                `;

            }


            html += `
                </div>
            `;


            monthCalendar.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR SEMANA
        ================================================= */

        function renderWeek() {

            if (!weekCalendar) {
                return;
            }


            const monday =
                getMonday(
                    currentDate
                );


            const weekDays = [];

            for (
                let i = 0;
                i < 5;
                i++
            ) {

                const date =
                    new Date(
                        monday
                    );


                date.setDate(
                    monday.getDate() + i
                );


                weekDays.push(
                    date
                );

            }


            let html = `

                <div class="week-calendar-grid">

                    <div class="week-time-column">

                        <div class="week-column-header">

                            <span>
                                Horário
                            </span>

                        </div>

            `;


            /* HORÁRIOS */

            for (
                let hour = 8;
                hour <= 18;
                hour++
            ) {

                html += `

                    <div class="week-time">

                        ${String(hour).padStart(2, "0")}:00

                    </div>

                `;

            }


            html += `
                    </div>
            `;


            /* DIAS */

            weekDays.forEach(
                date => {

                    html += `

                        <div class="week-day-column">

                            <div class="week-column-header">

                                <strong>
                                    ${String(
                                        date.getDate()
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </strong>

                                <span>
                                    ${weekdayShort[
                                        date.getDay()
                                    ]}
                                </span>

                            </div>

                    `;


                    for (
                        let hour = 8;
                        hour <= 18;
                        hour++
                    ) {

                        const appointmentsOfHour =
                            getAppointmentsForDate(
                                date
                            ).filter(
                                appointment =>
                                    Number(
                                        appointment.time
                                            .split(":")[0]
                                    ) === hour
                            );


                        html += `

                            <div class="week-slot">

                                ${
                                    appointmentsOfHour
                                        .map(
                                            appointment => `

                                                <div
                                                    class="week-appointment ${appointment.status}"
                                                >

                                                    <strong>
                                                        ${appointment.manufacturer}
                                                    </strong>

                                                    <span>
                                                        ${appointment.classification}
                                                    </span>

                                                </div>

                                            `
                                        )
                                        .join("")
                                }

                            </div>

                        `;

                    }


                    html += `
                        </div>
                    `;

                }
            );


            html += `
                </div>
            `;


            weekCalendar.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR DIA
        ================================================= */

        function renderDay() {

            if (!dayCalendar) {
                return;
            }


            const appointmentsOfDay =
                getAppointmentsForDate(
                    currentDate
                );


            let html = `

                <div class="day-view-header">

                    <div>

                        <span>
                            ${weekdayNames[
                                currentDate.getDay()
                            ].toUpperCase()}
                        </span>

                        <strong>
                            ${String(
                                currentDate.getDate()
                            ).padStart(
                                2,
                                "0"
                            )} de ${monthNames[
                                currentDate.getMonth()
                            ]} de ${currentDate.getFullYear()}
                        </strong>

                    </div>

                </div>


                <div class="day-timeline">

            `;


            for (
                let hour = 8;
                hour <= 18;
                hour++
            ) {

                const hourAppointments =
                    appointmentsOfDay.filter(
                        appointment =>
                            Number(
                                appointment.time
                                    .split(":")[0]
                            ) === hour
                    );


                html += `

                    <div class="day-timeline-row">


                        <div class="day-timeline-time">

                            ${String(
                                hour
                            ).padStart(
                                2,
                                "0"
                            )}:00

                        </div>


                        <div class="day-timeline-content">

                `;


                if (
                    hourAppointments.length === 0
                ) {

                    html += `

                        <div class="day-empty">
                            Nenhum agendamento
                        </div>

                    `;

                } else {

                    hourAppointments.forEach(
                        appointment => {

                            html += `

                                <div
                                    class="day-appointment ${appointment.status}"
                                >

                                    <div class="day-appointment-main">

                                        <span class="day-status-dot"></span>


                                        <div>

                                            <strong>
                                                ${appointment.manufacturer}
                                            </strong>

                                            <small>
                                                ${appointment.group} · ${appointment.classification}
                                            </small>

                                        </div>

                                    </div>


                                    <span class="day-status">
                                        ${appointment.statusLabel}
                                    </span>

                                </div>

                            `;

                        }
                    );

                }


                html += `

                        </div>

                    </div>

                `;

            }


            html += `
                </div>
            `;


            dayCalendar.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR TELA
        ================================================= */

        function renderCurrentView() {

            if (
                currentView ===
                "month"
            ) {

                renderMonth();

            }


            if (
                currentView ===
                "week"
            ) {

                renderWeek();

            }


            if (
                currentView ===
                "day"
            ) {

                renderDay();

            }


            updatePeriodTitle();

            updateNavigationButtons();

        }



        /* =================================================
           TROCAR VISUALIZAÇÃO
        ================================================= */

        function changeView(
            view
        ) {

            currentView =
                view;


            viewButtons.forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.view === view
                    );

                }
            );


            monthView.classList.toggle(
                "active",
                view === "month"
            );


            weekView.classList.toggle(
                "active",
                view === "week"
            );


            dayView.classList.toggle(
                "active",
                view === "day"
            );


            renderCurrentView();

        }



        /* =================================================
           LIMITES DOS BOTÕES
        ================================================= */

        function updateNavigationButtons() {

            if (
                currentView ===
                "month"
            ) {

                const currentMonth =
                    new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        1
                    );


                const startMonth =
                    new Date(
                        horizonStart
                    );


                const nextMonth =
                    new Date(
                        horizonStart.getFullYear(),
                        horizonStart.getMonth() + 1,
                        1
                    );


                previousPeriod.disabled =
                    currentMonth <= startMonth;


                nextPeriod.disabled =
                    currentMonth >= nextMonth;


                return;

            }



            if (
                currentView ===
                "day"
            ) {

                const previousDay =
                    new Date(
                        currentDate
                    );


                previousDay.setDate(
                    previousDay.getDate() - 1
                );


                const nextDay =
                    new Date(
                        currentDate
                    );


                nextDay.setDate(
                    nextDay.getDate() + 1
                );


                previousPeriod.disabled =
                    previousDay < horizonStart;


                nextPeriod.disabled =
                    nextDay > horizonEnd;


                return;

            }



            if (
                currentView ===
                "week"
            ) {

                const currentMonday =
                    getMonday(
                        currentDate
                    );


                const currentFriday =
                    getFriday(
                        currentDate
                    );


                const firstMonday =
                    getMonday(
                        horizonStart
                    );


                const lastMonday =
                    getMonday(
                        horizonEnd
                    );


                previousPeriod.disabled =
                    currentMonday <= firstMonday;


                nextPeriod.disabled =
                    currentMonday >= lastMonday;


                /*
                   Mantemos essas variáveis calculadas
                   para preservar o conceito da semana
                   inteira dentro do horizonte.
                */

                void currentFriday;

            }

        }



        /* =================================================
           MÊS / SEMANA / DIA
        ================================================= */

        viewButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        changeView(
                            button.dataset.view
                        );

                    }
                );

            }
        );



        /* =================================================
           HOJE
        ================================================= */

        if (todayButton) {

            todayButton.addEventListener(
                "click",
                () => {

                    currentDate =
                        new Date(today);

                    changeView(
                        "day"
                    );

                }
            );

        }



        /* =================================================
           PERÍODO ANTERIOR
        ================================================= */

        if (previousPeriod) {

            previousPeriod.addEventListener(
                "click",
                () => {

                    if (
                        previousPeriod.disabled
                    ) {
                        return;
                    }


                    /* MÊS */

                    if (
                        currentView ===
                        "month"
                    ) {

                        currentDate =
                            new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth() - 1,
                                1
                            );

                    }


                    /* SEMANA */

                    else if (
                        currentView ===
                        "week"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() - 7
                        );


                        currentDate =
                            newDate;

                    }


                    /* DIA */

                    else if (
                        currentView ===
                        "day"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() - 1
                        );


                        currentDate =
                            newDate;

                    }


                    renderCurrentView();

                }
            );

        }



        /* =================================================
           PRÓXIMO PERÍODO
        ================================================= */

        if (nextPeriod) {

            nextPeriod.addEventListener(
                "click",
                () => {

                    if (
                        nextPeriod.disabled
                    ) {
                        return;
                    }


                    /* MÊS */

                    if (
                        currentView ===
                        "month"
                    ) {

                        currentDate =
                            new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth() + 1,
                                1
                            );

                    }


                    /* SEMANA */

                    else if (
                        currentView ===
                        "week"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() + 7
                        );


                        currentDate =
                            newDate;

                    }


                    /* DIA */

                    else if (
                        currentView ===
                        "day"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() + 1
                        );


                        currentDate =
                            newDate;

                    }


                    renderCurrentView();

                }
            );

        }



        /* =================================================
           FILTRO DE GRUPO
        ================================================= */

        if (groupFilter) {

            groupFilter.addEventListener(
                "change",
                () => {

                    renderCurrentView();

                }
            );

        }



        /* =================================================
           NOVO AGENDAMENTO
        ================================================= */

        if (
            newAppointmentButton
        ) {

            newAppointmentButton.addEventListener(
                "click",
                () => {

                    alert(
                        "O cadastro de novo agendamento será construído na próxima etapa."
                    );

                }
            );

        }



        /* =================================================
           INICIALIZAÇÃO
        ================================================= */

        changeView(
            "month"
        );

    }
);