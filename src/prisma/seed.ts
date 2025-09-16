/* eslint-disable no-console */
import { PrismaClient, Role, ClientType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { fakerPT_BR as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

/** Helpers */
const hasModel = (name: string) => Boolean((prisma as any)[name]);

const addressModelName = (): 'address' | 'clientAddress' | null => {
  if (hasModel('address')) return 'address';
  if (hasModel('clientAddress')) return 'clientAddress';
  return null;
};

const makeAddress = (client: { id: string; type: ClientType }) => {
  const isPJ = client.type === ClientType.PJ;
  return {
    clientId: client.id,                         // ajuste se seu FK tiver outro nome
    label: isPJ ? faker.helpers.arrayElement(['Matriz', 'Filial']) : 'Residencial',
    zip: faker.location.zipCode('########'), // se seu schema usa "cep", troque por cep
    street: faker.location.street(),
    number: faker.number.int({ min: 10, max: 2999 }).toString(),
    district: faker.location.streetAddress(),     // se usa "bairro", troque por bairro
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }), // "SP", "RS", ...
    // assignedUserId: client.id,
    complement: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.3 }) ?? null,
  };
};

const onlyDigits = (s: string) => s.replace(/\D/g, '');

const randomCPF = () => {
  // Para seed: 11 dígitos aleatórios (não valida dígito verificador)
  return Array.from({ length: 11 }, () => faker.number.int({ min: 0, max: 9 })).join('');
};
const randomCNPJ = () => Array.from({ length: 14 }, () => faker.number.int({ min: 0, max: 9 })).join('');

const randomPlate = () => {
  // Formato Mercosul simplificado: ABC1D23
  const letters = () => String.fromCharCode(faker.number.int({ min: 65, max: 90 }));
  const digit = () => faker.number.int({ min: 0, max: 9 }).toString();
  return `${letters()}${letters()}${letters()}${digit()}${letters()}${digit()}${digit()}`;
};

async function seedAddresses(clients: Array<{ id: string; type: ClientType }>) {
  const modelName = addressModelName();
  if (!modelName) {
    console.log('⏭️  Pulando addresses (modelo "address" ou "clientAddress" não existe no Prisma).');
    return;
  }

  const addrModel = (prisma as any)[modelName] as {
    count: (args?: any) => Promise<number>;
    createMany: (args: any) => Promise<any>;
  };

  let total = 0;
  for (const client of clients) {
    const already = await addrModel.count({ where: { clientId: client.id } });
    if (already > 0) continue; // idempotente por cliente

    const qty = client.type === ClientType.PJ ? 2 : 1;
    const data = Array.from({ length: qty }, () => makeAddress(client));
    await addrModel.createMany({ data, skipDuplicates: true });
    total += qty;
  }
  console.log(`🏠 Addresses criados: ${total}`);
}

async function seedCore() {
  // Senhas
  const adminPassRaw = process.env.ADMIN_PASSWORD || 'admin123';
  const colabPassRaw = process.env.COLAB_PASSWORD || 'colab123';
  const adminPass = await bcrypt.hash(adminPassRaw, 10);
  const colabPass = await bcrypt.hash(colabPassRaw, 10);

  // 1) Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@erp.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash: adminPass,
      role: Role.ADMIN,
    },
  });

  // 2) Colaboradores (3 exemplos)
  const colaboradoresData = [
    { name: 'Marina Souza', email: 'marina@erp.com' },
    { name: 'Carlos Lima', email: 'carlos@erp.com' },
    { name: 'Rafael Braga', email: 'rafael@erp.com' },
  ];

  const colaboradores = await Promise.all(
    colaboradoresData.map((c) =>
      prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: {
          name: c.name,
          email: c.email,
          passwordHash: colabPass,
          role: Role.COLABORADOR,
        },
      }),
    ),
  );

  // 3) Clientes (PF e PJ)
  type ClientSeed = {
    type: ClientType;
    name: string;
    document: string;
    email: string;
  };

  const baseClients: ClientSeed[] = [
    {
      type: ClientType.PF,
      name: 'Cliente Demo',
      document: '00000000000',
      email: 'cliente@demo.com',
    },
  ];

  // + PF aleatórios
  for (let i = 0; i < 4; i++) {
    baseClients.push({
      type: ClientType.PF,
      name: faker.person.fullName(),
      document: randomCPF(),
      email: faker.internet.email({ firstName: 'pf', provider: 'example.com' }),
    });
  }
  // + PJ aleatórios
  for (let i = 0; i < 3; i++) {
    baseClients.push({
      type: ClientType.PJ,
      name: faker.company.name(),
      document: randomCNPJ(),
      email: faker.internet.email({ firstName: 'pj', provider: 'example.com' }),
    });
  }

  const clients = await Promise.all(
    baseClients.map((c) =>
      prisma.client.upsert({
        where: { document: onlyDigits(c.document) },
        update: { name: c.name, email: c.email },
        create: {
          type: c.type,
          name: c.name,
          document: onlyDigits(c.document),
          email: c.email,
        },
      }),
    ),
  );

  await seedAddresses(clients);

  // 4) Tipos de Serviço
  const serviceTypesNames = [
    'Manutenção Preventiva',
    'Manutenção Corretiva',
    'Instalação de Split',
    'Limpeza Completa',
    'Higienização de Dutos',
  ];
  const serviceTypes = await Promise.all(
    serviceTypesNames.map((name) =>
      prisma.serviceType.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // 5) Veículos
  const vehiclePlates = ['ABC1D23', randomPlate(), randomPlate()];
  const vehicles = await Promise.all(
    vehiclePlates.map((plate) =>
      prisma.vehicle.upsert({
        where: { plate },
        update: {},
        create: {
          plate,
          model: faker.vehicle.model(),
        },
      }),
    ),
  );

  console.log('✅ Core seed ok:', {
    admin: admin.email,
    colaboradores: colaboradores.length,
    clients: clients.length,
    serviceTypes: serviceTypes.length,
    vehicles: vehicles.length,
  });

  return { admin, colaboradores, clients, serviceTypes, vehicles };
}

/**
 * Seed opcional para modelos que podem não existir no teu schema.
 * Só roda se o modelo existir e se a tabela estiver vazia (para evitar duplicidade).
 */
async function seedOptional({
  clients,
  colaboradores,
  serviceTypes,
}: {
  clients: any[];
  colaboradores: any[];
  serviceTypes: any[];
}) {
  // 6) Appointments (se existir)
  if (hasModel('appointment')) {
    const appointmentModel = (prisma as any).appointment as {
      count: () => Promise<number>;
      createMany: (args: any) => Promise<any>;
    };

    const count = await appointmentModel.count();
    if (count === 0) {
      const sampleAppointments = Array.from({ length: 6 }).map(() => {
        const client = faker.helpers.arrayElement(clients);
        const tech = faker.helpers.arrayElement(colaboradores);
        const st = faker.helpers.arrayElement(serviceTypes);
        const start = faker.date.soon({ days: 20 });
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const address = makeAddress(clients[0]);
        const code = faker.lorem.words();

        // Se teu enum chama AppointmentStatus, os valores abaixo devem existir no schema
        const status = faker.helpers.arrayElement([
          'SCHEDULED',
          'CONFIRMED',
          'CANCELED',
          'DONE',
        ]);

        return {
          clientId: client.id,
          code: code,
          serviceTypeId: st.id,
          // assignedUserId: tech.id,
          addressCity: address.city,
          addressStreet: address.street,
          addressState: address.state,
          addressZip: address.zip,
          startAt: start,
          endAt: end,
          status,
        };
      });

      await appointmentModel.createMany({
        data: sampleAppointments,
        skipDuplicates: true,
      });
      console.log(`🗓️  Appointments criados: ${sampleAppointments.length}`);
    } else {
      console.log('↩️  Appointments já existentes, mantendo intacto.');
    }
  } else {
    console.log('⏭️  Pulando appointments (modelo não existe no Prisma).');
  }

  // 7) Service Orders (se existir)
  if (hasModel('serviceOrder')) {
    const soModel = (prisma as any).serviceOrder as {
      count: () => Promise<number>;
      createMany: (args: any) => Promise<any>;
    };
    const count = await soModel.count();
    if (count === 0) {
      const sampleOrders = Array.from({ length: 4 }).map(() => {
        const client = faker.helpers.arrayElement(clients);
        const st = faker.helpers.arrayElement(serviceTypes);
        const code = faker.lorem.words();
        const tech = faker.helpers.arrayElement(colaboradores);
        const status = faker.helpers.arrayElement([
          'OPEN',
          'IN_PROGRESS',
          'PAUSED',
          'COMPLETED',
          'CANCELED',
        ]);

        return {
          clientId: client.id,
          code: code,
          // serviceTypeId: st.id,
          // title: `OS - ${st.name}`,
          description: faker.lorem.lines({ min: 1, max: 2 }),
          status,
          // openedAt: faker.date.recent({ days: 15 }),
          // notes: faker.lorem.sentence(),
          createdById: tech.id,
        };
      });

      await soModel.createMany({ data: sampleOrders, skipDuplicates: true });
      console.log(`🧰  ServiceOrders criadas: ${sampleOrders.length}`);
    } else {
      console.log('↩️  ServiceOrders já existentes, mantendo intacto.');
    }
  } else {
    console.log('⏭️  Pulando serviceOrder (modelo não existe no Prisma).');
  }

  // 8) Budgets (se existir) — sempre vinculados a ServiceOrders existentes
  if (hasModel('budget')) {
    const budgetModel = (prisma as any).budget as {
      count: (args?: any) => Promise<number>;
      createMany: (args: any) => Promise<any>;
      findMany?: (args?: any) => Promise<any>;
    };

    const count = await budgetModel.count();
    if (count === 0) {
      if (!hasModel('serviceOrder')) {
        console.log('⏭️  Pulando budgets: não há modelo serviceOrder.');
      } else {
        const soModel = (prisma as any).serviceOrder as {
          findMany: (
            args?: any,
          ) => Promise<Array<{ id: string; clientId?: string }>>;
        };

        // Carrega todos os service orders (pelo menos id e clientId)
        const serviceOrders = await soModel.findMany({
          select: { id: true, clientId: true },
        });
        if (serviceOrders.length === 0) {
          console.log(
            '⏭️  Pulando budgets: não há service orders para vincular.',
          );
        } else {
          // Evita duplicar caso haja relação 1:1 (Budget.serviceOrderId @unique)
          let existingSet = new Set<string>();
          if (budgetModel.findMany) {
            const existing = await budgetModel
              .findMany({ select: { serviceOrderId: true } })
              .catch(() => []);
            existingSet = new Set(
              (existing as Array<{ serviceOrderId: string | null }>)
                .map((b) => b.serviceOrderId!)
                .filter(Boolean),
            );
          }
          const availableSOs = serviceOrders.filter(
            (so) => !existingSet.has(so.id),
          );
          if (availableSOs.length === 0) {
            console.log(
              '↩️  Budgets já existem para todos os service orders, nada a fazer.',
            );
          } else {
            const take = Math.min(3, availableSOs.length); // crie só alguns
            const sampleBudgets = Array.from({ length: take }).map(() => {
              const so = faker.helpers.arrayElement(availableSOs);
              const status = faker.helpers.arrayElement([
                'DRAFT',
                'SENT',
                'APPROVED',
                'REJECTED',
                'EXPIRED',
              ]);
              return {
                serviceOrderId: so.id, // 🔗 FK válida
                clientId: so.clientId ?? undefined, // se o schema exigir clientId, reaproveita do SO
                // title: `Orçamento - ${faker.commerce.productName()}`,
                amount: Number(
                  faker.commerce.price({ min: 200, max: 5000 }),
                ), // se for Decimal no schema, ok
                status,
                expiresAt: faker.date.soon({ days: 30 }),
              };
            });

            await budgetModel.createMany({
              data: sampleBudgets,
              skipDuplicates: true,
            });
            console.log(`💰  Budgets criados: ${sampleBudgets.length}`);
          }
        }
      }
    } else {
      console.log('↩️  Budgets já existentes, mantendo intacto.');
    }
  } else {
    console.log('⏭️  Pulando budget (modelo não existe no Prisma).');
  }
}

async function main() {
  const core = await seedCore();
  await seedOptional({
    clients: core.clients,
    colaboradores: core.colaboradores,
    serviceTypes: core.serviceTypes,
  });

  console.log('🎉 Seed finalizado com sucesso.');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
