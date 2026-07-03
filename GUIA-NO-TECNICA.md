# Guía del Sistema ISWZ3206
## Una explicación clara para directivos, usuarios finales y evaluadores

> Este documento explica **qué hace el sistema**, **cómo lo usa cada persona** y **por qué es seguro**, sin necesidad de conocimientos de programación.

---

## 📋 ¿Qué hace el sistema?

El proyecto integra **dos aplicaciones independientes** que trabajan juntas de forma segura:

---

### 🏥 Aplicación 1 — Triage Remoto

**Para qué sirve:** Permite que pacientes reciban atención médica desde casa, sin necesidad de ir al consultorio para una primera evaluación.

**¿Cómo lo usa un paciente?**

1. El paciente entra al sistema y **crea su cuenta**.
2. Llena un **cuestionario de síntomas** (¿qué le duele?, ¿hace cuánto?, ¿tiene fiebre?).
3. El sistema **analiza automáticamente** las respuestas y le asigna un nivel de urgencia:
   - 🔴 **ROJO** — Urgente. Requiere atención inmediata.
   - 🟡 **AMARILLO** — Moderado. Atención en las próximas horas.
   - 🟢 **VERDE** — Leve. Puede esperar o resolverse con indicaciones básicas.
4. Un médico revisa el caso y **lo atiende por videollamada**, directamente desde el sistema (sin necesidad de instalar nada extra).
5. Al finalizar la consulta, el médico registra que fue atendida.

**¿Qué pueden hacer los médicos?**
Ver la lista de pacientes en espera, ordenados por urgencia, y abrir la videollamada con un clic.

**¿Qué puede hacer un administrador de Triage?**
Gestionar cuentas de médicos y pacientes, ver reportes generales y configurar el sistema.

---

### 💰 Aplicación 2 — Monetix

**Para qué sirve:** Es un gestor de gastos personales. Ayuda a las personas a llevar un registro de su dinero: qué ganan, qué gastan y cuánto quieren ahorrar.

**¿Cómo lo usa una persona?**

1. Ingresa al sistema y registra sus **ingresos y gastos** (comida, transporte, salud, entretenimiento, etc.).
2. Puede organizar los gastos por **categorías** que él mismo define.
3. Establece **metas de ahorro** (por ejemplo: "quiero ahorrar $200 este mes para una emergencia").
4. El sistema le avisa cuando está por superar su presupuesto en alguna categoría — como una **alerta amigable**, no una sanción.
5. Puede ver gráficos y resúmenes de cómo está usando su dinero.

**¿Qué puede hacer un administrador de Monetix?**
Ver estadísticas generales de uso, gestionar cuentas y configurar categorías predeterminadas.

---

## 🔗 ¿Cómo están conectados los dos sistemas?

La conexión más importante es esta: **cuando un médico marca una consulta como "atendida" en Triage, el gasto de esa consulta aparece automáticamente en Monetix** — sin que el paciente tenga que hacer nada.

El monto del gasto depende de qué tan urgente fue la consulta:

| Nivel de urgencia | Monto registrado en Monetix |
|---|---|
| 🔴 ROJO (urgente) | $150 |
| 🟡 AMARILLO (moderado) | $80 |
| 🟢 VERDE (leve) | $40 |

El gasto se registra automáticamente en la categoría **"Salud"** dentro de Monetix.

**¿Por qué esto es útil?** El paciente no necesita recordar cuánto pagó ni abrir otra aplicación para anotar el gasto. El sistema lo hace solo.

### Diagrama del flujo de datos

```
PACIENTE                  TRIAGE REMOTO               MONETIX
   │                           │                          │
   │  1. Llena cuestionario    │                          │
   ├──────────────────────────►│                          │
   │                           │                          │
   │                           │  2. Clasifica urgencia   │
   │                           │     (ROJO/AMARILLO/VERDE)│
   │                           │                          │
   │  3. Médico atiende por    │                          │
   │     videollamada          │                          │
   │◄──────────────────────────│                          │
   │                           │                          │
   │                           │  4. Médico marca         │
   │                           │     "consulta atendida"  │
   │                           │                          │
   │                           │  5. Triage avisa a ──────►
   │                           │     Monetix (cifrado)    │
   │                           │                          │
   │                           │                    6. Monetix crea
   │                           │                       gasto en
   │                           │                       categoría Salud
   │                           │                          │
   │  7. El paciente ve el     │                          │
   │     gasto en su Monetix ◄─┼──────────────────────────┘
   │     sin hacer nada        │
```

---

## 🔒 ¿Cómo funciona la seguridad?

La seguridad del sistema se diseñó con tres principios: **una sola llave maestra**, **datos que viajan en sobres sellados** y **puertas con cerrojo doble** para las personas con más responsabilidad.

### 1. Una sola llave para entrar a todo 🗝️

En muchos servicios en internet ya existe esto: cuando uno hace clic en "Iniciar sesión con Google" y puede entrar a múltiples aplicaciones sin volver a poner su contraseña. El sistema usa el mismo concepto, pero gestionado por la universidad.

Con **una sola cuenta y contraseña**, el usuario puede entrar tanto a Triage como a Monetix. No hay que recordar dos contraseñas distintas.

Esto también significa que si el área de sistemas desactiva una cuenta (por ejemplo, de un médico que ya no trabaja), esa persona queda bloqueada de **ambas aplicaciones al mismo tiempo**, automáticamente.

### 2. Los datos médicos viajan en un sobre sellado ✉️🔐

Cuando Triage le envía información a Monetix (por ejemplo, "este paciente tuvo una consulta urgente"), esa información **no viaja en texto abierto** por internet. Viaja cifrada, como si estuviera dentro de una caja fuerte digital que solo Monetix puede abrir.

Esto significa que aunque alguien interceptara la comunicación entre los dos sistemas, no podría leer nada — solo vería caracteres sin sentido.

### 3. Cerrojo doble para médicos y administradores 🔑🔑

Los médicos y administradores del sistema manejan información sensible. Por eso, además de su contraseña, deben confirmar su identidad con un **código temporal** que genera una aplicación en su teléfono (como Google Authenticator o Microsoft Authenticator).

Esto significa que incluso si alguien roba la contraseña de un médico, **no puede entrar** al sistema sin tener también el teléfono del médico en la mano.

### 4. Cada persona solo ve lo que le corresponde 👁️

- Un paciente **solo ve sus propios triajes**. No puede ver los de otros pacientes.
- Un usuario de Monetix **no puede ver datos médicos** de nadie.
- Un médico puede ver los triajes de sus pacientes, pero **no tiene acceso a Monetix**.
- Solo los administradores tienen acceso completo a su respectiva aplicación.

---

## 👥 ¿Quién puede hacer qué?

### En Triage Remoto

| Acción | Paciente | Médico | Admin Triage |
|---|:---:|:---:|:---:|
| Crear cuenta y acceder | ✅ | ✅ | ✅ |
| Llenar cuestionario de síntomas | ✅ | — | — |
| Ver mi propio triaje | ✅ | — | — |
| Ver todos los triajes | — | ✅ | ✅ |
| Atender pacientes por videollamada | — | ✅ | — |
| Marcar consulta como atendida | — | ✅ | — |
| Gestionar cuentas de usuarios | — | — | ✅ |
| Ver reportes generales | — | — | ✅ |

### En Monetix

| Acción | Usuario Monetix | Admin Monetix |
|---|:---:|:---:|
| Ver mis gastos e ingresos | ✅ | ✅ |
| Registrar gastos manualmente | ✅ | ✅ |
| Crear categorías propias | ✅ | ✅ |
| Establecer metas de ahorro | ✅ | ✅ |
| Recibir alertas de presupuesto | ✅ | ✅ |
| Ver estadísticas de todos los usuarios | — | ✅ |
| Gestionar cuentas | — | ✅ |
| Configurar categorías globales | — | ✅ |

> **Nota:** Los gastos de salud generados automáticamente desde Triage aparecen en la cuenta del paciente **sin que nadie del equipo de Monetix pueda ver información médica** — solo ven el monto y la categoría "Salud".

---

## 🚪 ¿Cómo inicio sesión?

El sistema ofrece **dos formas de entrar**, dependiendo del tipo de usuario:

### Opción A — Inicio de sesión universitario (recomendado)

Si su institución le ha dado una cuenta universitaria, puede usar el botón **"Iniciar sesión con cuenta universitaria"** en la pantalla de entrada.

- Es la opción más segura.
- Con una sola cuenta accede a ambas aplicaciones.
- Si olvida su contraseña, la recupera en el portal universitario (no en cada aplicación por separado).
- Los médicos y administradores que usen esta opción también verán la solicitud del **código de verificación en su teléfono**.

**¿Cuándo usarla?** Siempre que sea posible. Es la opción preferida.

### Opción B — Inicio de sesión local

Si aún no tiene cuenta universitaria, o si está en un proceso de prueba, puede registrarse directamente en cada aplicación con un correo y contraseña.

- Es más sencilla para comenzar, pero menos integrada.
- Tendrá cuentas separadas en Triage y en Monetix.
- El gasto automático de Triage a Monetix **también funciona** con esta opción, siempre que el correo sea el mismo en ambas aplicaciones.

**¿Cuándo usarla?** Durante la fase inicial o si el sistema universitario no está disponible temporalmente.

---

## ❓ Preguntas frecuentes

**¿Tengo que instalar algún programa para usar el sistema?**

No. Ambas aplicaciones funcionan en el navegador web (Chrome, Firefox, Edge). Solo necesita internet y un dispositivo (computadora, tableta o teléfono). Para las videollamadas tampoco se instala nada adicional.

---

**¿Mis datos médicos pueden verlos las personas de Monetix?**

No. El diseño del sistema garantiza que Monetix solo recibe el monto y la categoría de gasto ("Salud"), sin ningún detalle médico. Nadie del equipo de Monetix puede ver diagnósticos, síntomas ni información clínica.

---

**¿Qué pasa si me olvido de registrar un gasto de salud?**

Si la consulta fue a través de Triage, el gasto se registra automáticamente — no hay nada que olvidar. Si tuvo una consulta médica fuera del sistema (por ejemplo, en una clínica privada), puede registrar ese gasto manualmente en Monetix como cualquier otro gasto.

---

**¿Qué tan urgente tengo que ser para que me atiendan primero?**

El sistema clasifica según sus síntomas, no según el orden de llegada. Si usted tiene síntomas graves (nivel ROJO), el médico lo verá antes que alguien con síntomas leves (nivel VERDE), aunque ese otro paciente haya llenado el cuestionario antes. Esto es igual a como funciona una sala de urgencias real.

---

**¿Puedo usar el sistema desde mi teléfono celular?**

Sí. Ambas aplicaciones están diseñadas para funcionar en pantallas pequeñas. Las videollamadas con el médico también funcionan desde el celular, siempre que tenga cámara y micrófono habilitados.

---

**Si pierdo el acceso a mi teléfono (el del código de verificación), ¿qué hago?**

Debe contactar al administrador del sistema. Él tiene la capacidad de restablecer su método de verificación para que pueda volver a entrar. Esta medida de seguridad existe precisamente para proteger su cuenta en caso de pérdida del dispositivo.

---

**¿Los dos sistemas son de la misma empresa?**

En el contexto de este proyecto, ambas aplicaciones fueron desarrolladas como parte del mismo proyecto universitario (ISWZ3206), pero están diseñadas para funcionar de forma independiente. Triage Remoto se enfoca en salud y Monetix en finanzas personales; la conexión entre ellas es un ejemplo de cómo dos sistemas distintos pueden comunicarse de forma segura y automática.

---

## 📌 Resumen ejecutivo

| Característica | Descripción simple |
|---|---|
| Triage Remoto | Consultas médicas en línea con clasificación automática de urgencia |
| Monetix | Gestión de gastos personales con alertas de presupuesto |
| Integración | Los gastos de salud fluyen automáticamente de Triage a Monetix |
| Login único | Una cuenta para los dos sistemas |
| Seguridad de datos | Los datos viajan cifrados, como en un sobre sellado digital |
| Doble verificación | Médicos y admins confirman identidad con su teléfono además de la contraseña |
| Control de acceso | Cada persona solo ve la información que le corresponde |

---

*Documento elaborado para evaluadores, directivos y usuarios finales del proyecto ISWZ3206 — Desarrollo de Software Seguro.*
*Versión orientada a audiencia no técnica. Para documentación técnica, consulte el repositorio del proyecto.*
